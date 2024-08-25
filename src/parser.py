import re
from pathlib import Path

from PIL.Image import Image
from platformdirs import user_cache_path
from tesserocr import PyTessBaseAPI

import database as db
from theme import Theme

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


def image_to_string(image: Image, preprocessed: bool = False) -> str:
    """Converts the given image to a string via Tesseract OCR.

    Args:
        image (Image): The image to convert
        preprocessed (bool, optional): Whether the image has already been preprocessed. Defaults to False.

    Returns:
        str: The image as a string.
    """

    if not preprocessed:
        image = Theme.strip(image)

    # Tesseract image to string
    tess.SetImage(image)
    string = tess.GetUTF8Text().strip()

    # Manual replacements for commonly misspelled words
    replacements = {"Recelver": "Receiver", "Blucprint": "Blueprint"}
    for repl in replacements:
        string = string.replace(repl, replacements[repl])

    return string


def get_num_rewards(image: Image) -> int:
    """Calculates the number of rewards.

    This function works by finding the number of item endings in the bottom line of the reward names.

    Args:
        image (Image): The image to parse.

    Returns:
        int: The number of rewards.
    """

    scale = get_scale(image)
    width = _REWARD_TOTAL_WIDTH * scale
    left = (image.width - width) / 2
    bottom = image.height / 2 - _REWARD_BOTTOM * scale
    top = bottom - _LINE_HEIGHT * scale

    rewards = image_to_string(image.crop((left, top, left + width, bottom)))

    return len(re.findall("|".join(db.item_endings), rewards))


def parse_image(image: Image) -> list[str]:
    """Parses the given image for rewards and returns the reward names.

    Args:
        image (Image): The image to parse.

    Returns:
        list[str]: The reward names.
    """

    images = cut_image(image, get_num_rewards(image))
    line_height = _LINE_HEIGHT * get_scale(image)
    rewards = []

    # Do for each reward
    for image in images:
        off = 0
        reward = ""
        valid = True

        # Parse line by line
        while valid:
            valid = False

            # Get line as str
            line = image.crop(
                (0, image.height - line_height - off, image.width, image.height - off)
            )
            line = image_to_string(line)

            # Check words in line
            line_str = ""
            for word in line.split():
                if word in db.words:
                    line_str += f" {word}"
                    valid = True

            # Add to reward name and add offset to go up a line
            reward = f"{line_str.strip()} {reward.strip()}"
            off += line_height

        rewards.append(reward.strip())

    # print(rewards)

    return rewards
