import json
import re
import sys
from pathlib import Path

import Levenshtein as lev
import PIL.Image as Img
from PIL.Image import Image
from platformdirs import user_cache_path
from tesserocr import PyTessBaseAPI

import database as db
import theme

# Define save dir path and ensure it exists
_SAVE_DIR = user_cache_path("wfinfo") / "images"
_SAVE_DIR.mkdir(parents=True, exist_ok=True)

_REWARD_WIDTH = 242  # Per player
_REWARD_TOTAL_WIDTH = _REWARD_WIDTH * 4
_REWARD_BOTTOM = 80  # center - bottom = real bottom
_LINE_HEIGHT = 24
_REWARD_HEIGHT = _LINE_HEIGHT * 3  # Height of 3 lines

# Image save count for filename
_tmp_count = 0

# Tesseract api
tess = PyTessBaseAPI(
    path="/usr/share/tessdata",  # Manual path cause unable to autodetect
    psm=7,
    variables={"tessedit_char_whitelist": db.whitelist_chars},
)


def save_image(image: Image) -> Path:
    """Saves the given image to a temporary file.

    Args:
        image (Image): The image to save.

    Returns:
        Path: The path to the file.
    """

    global _tmp_count

    save_path = _SAVE_DIR / f"{_tmp_count}.png"
    _tmp_count += 1

    image.save(save_path)

    return save_path


def get_scale(image: Image) -> float:
    """Calculates the scale of the image based on its dimensions.

    Args:
        image (Image): The image to calculate scale for.

    Returns:
        float: The scale.
    """

    return (
        image.height / 1080
        if image.width / image.height > 16 / 9
        else image.width / 1920
    )


def cut_image(image: Image, num_rewards: int) -> list[Image]:
    """Cuts the given image into sections for each reward based on the number of rewards.

    Args:
        image (Image): The image to cut.
        num_rewards (int): The number of rewards.

    Returns:
        list[Image]: The images of each reward name.
    """

    scale = get_scale(image)
    width = _REWARD_WIDTH * scale
    left = (image.width - width * num_rewards) / 2
    bottom = image.height / 2 - _REWARD_BOTTOM * scale
    top = bottom - _REWARD_HEIGHT * scale
    return [
        image.crop((left + width * i, top, left + width * (i + 1), bottom))
        for i in range(num_rewards)
    ]


def image_to_string(
    image: Image, preprocessed: bool = False, validate: bool = True
) -> str:
    """Converts the given image to a string via Tesseract OCR.

    Args:
        image (Image): The image to convert
        preprocessed (bool, optional): Whether the image has already been preprocessed. Defaults to False.
        validate (bool, optional): Whether to validate the words in the string against the database of words. Defaults to True.

    Returns:
        str: The image as a string.
    """

    if not preprocessed:
        image = theme.strip(image)

    # Tesseract image to string
    tess.SetImage(image)
    string = tess.GetUTF8Text().strip()

    # Return if no validation
    if not validate:
        return string

    # Manual replacements for commonly misspelled words
    replacements = {"Recelver": "Receiver", "Blucprint": "Blueprint"}
    for repl in replacements:
        string = string.replace(repl, replacements[repl])

    # 2nd layer of checking via fuzzy matching each word
    checked = ""
    for word in string.split():
        valid_word = None
        if word in db.words:
            valid_word = word
        else:
            best_ratio = 0
            for w in db.words:
                ratio = lev.ratio(word, w, score_cutoff=0.8)
                if ratio > best_ratio:
                    best_ratio = ratio
                    valid_word = w
        if valid_word is not None:
            checked += f" {valid_word}"

    return checked.strip()


def get_bottom_line_rewards(image: Image) -> Image:
    scale = get_scale(image)
    width = _REWARD_TOTAL_WIDTH * scale
    left = (image.width - width) / 2
    bottom = image.height / 2 - _REWARD_BOTTOM * scale
    top = bottom - _LINE_HEIGHT * scale

    return image.crop((left, top, left + width, bottom))


def get_num_rewards(image: Image) -> int:
    """Calculates the number of rewards.

    This function works by finding the number of item endings in the bottom line of the reward names.

    Args:
        image (Image): The image to parse.

    Returns:
        int: The number of rewards.
    """

    rewards = image_to_string(get_bottom_line_rewards(image))

    return len(re.findall("|".join(db.item_endings), rewards))


def parse_image(image: Image, num_rewards: int = None) -> list[str]:
    """Parses the given image for rewards and returns the reward names.

    Args:
        image (Image): The image to parse.
        num_rewards (int, optional): The number of rewards in the image. Defaults to None for autodetection.

    Returns:
        list[str]: The reward names.
    """

    if num_rewards is None:
        num_rewards = get_num_rewards(image)

    # Initialise theme module for image
    theme.init(image)

    images = cut_image(image, num_rewards)
    line_height = _LINE_HEIGHT * get_scale(image)
    rewards = []

    # Do for each reward
    for image in images:
        off = 0
        reward = ""
        line = True  # Default to init loop

        # Parse line by line
        while line:
            # Get line as str
            line = image.crop(
                (0, image.height - line_height - off, image.width, image.height - off)
            )
            line = image_to_string(line)

            # Add to reward name and add offset to go up a line
            reward = f"{line} {reward.strip()}"
            off += line_height

        reward = reward.strip()
        rewards.append(reward)

    return rewards


# Parse given image and output if called as main script
if __name__ == "__main__":
    with Img.open(sys.argv[1]).convert("RGB") as image:
        print(
            json.dumps(
                [
                    (
                        {"name": r, **db.items[r]}
                        if r in db.items
                        else {
                            "name": f"Invalid ({r})",
                            "price": {"platinum": 0, "ducats": 0},
                            "sold": {"today": 0, "yesterday": 0},
                            "vaulted": False,
                        }
                    )
                    for r in parse_image(
                        image, int(sys.argv[2]) if len(sys.argv) > 2 else None
                    )
                ]
            )
        )
