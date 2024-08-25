import re
from pathlib import Path

import cv2
import numpy as np
import pytesseract as tess
from PIL.Image import Image
from platformdirs import user_cache_path

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


def save_image(image: Image | np.ndarray, cv: bool = False) -> Path:
    """Saves the given image to a temporary file.

    Args:
        image (Image | np.ndarray): The image to save.
        cv (bool, optional): Whether the image is a cv image (i.e. a numpy array). Defaults to False.

    Returns:
        Path: The path to the file.
    """

    global _tmp_count

    save_path = _SAVE_DIR / f"{_tmp_count}.png"
    _tmp_count += 1

    if cv:
        cv2.imwrite(save_path, image)
    else:
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


def resize_image(image: Image, height: int) -> Image:
    """Resizes the given image to the given height.

    This method does not modify the given image and keeps the aspect ratio of the image.

    Args:
        image (Image): The image to resize.
        height (int): The height to resize to.

    Returns:
        Image: The resized image.
    """

    factor = height / image.height
    if factor > 1:
        return image.resize((int(factor * image.width), int(factor * image.height)))
    return image


def preprocess_image(image: Image) -> np.ndarray:
    """Preprocesses the given image for OCR.

    This strips all colours to a range, resizes, thins and skeletonises the image.

    Args:
        image (Image): The image to preprocess.

    Returns:
        np.ndarray: The image after preprocessing.
    """

    # Strip colours except text

    # Resize image
    image = resize_image(image, 256)
    path = save_image(image)

    # Make stroke width uniform
    image = cv2.imread(path, 0)
    kernel = np.ones((5, 5), np.uint8)
    image = cv2.erode(image, kernel, iterations=1)

    save_image(image, cv=True)

    return image


def image_to_string(
    image: Image | np.ndarray, preprocessed: bool = False, psm: int = 7
) -> str:
    """Converts the given image to a string via Tesseract OCR.

    Args:
        image (Image | np.ndarray): The image to convert
        preprocessed (bool, optional): Whether the image has already been preprocessed. Defaults to False.
        psm (int, optional): The psm option to pass to tesseract. Range [0, 13]. Defaults to 7.

    Returns:
        str: The image as a string.
    """

    if not preprocessed:
        image = preprocess_image(image)

    # Tesseract image to string, look at manpage for config
    config = f"--psm {psm} -c tessedit_char_whitelist='{db.whitelist_chars}'"
    string = tess.image_to_string(image, config=config).strip()

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

    print(rewards)

    return rewards
