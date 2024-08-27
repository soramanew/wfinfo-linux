from __future__ import annotations

import numpy as np
import PIL.Image as Img
from PIL.Image import Image

type Pixel = tuple[int, int, int] | np.ndarray
type Theme = tuple[Pixel, ...]


# Primary colour, secondary colour
themes = [
    ((190, 169, 102), (245, 227, 173)),  # Vitruvian
    ((153, 31, 35), (255, 61, 51)),  # Stalker
    ((238, 193, 105), (236, 211, 162)),  # Baruuk
    ((35, 201, 245), (111, 229, 253)),  # Corpus
    ((57, 105, 192), (255, 115, 230)),  # Fortuna
    ((255, 189, 102), (255, 224, 153)),  # Grineer
    ((36, 184, 242), (255, 241, 191)),  # Lotus
    ((140, 38, 92), (245, 73, 93)),  # Nidus
    ((20, 41, 29), (178, 125, 5)),  # Orokin
    ((9, 78, 106), (6, 106, 74)),  # Tenno
    ((2, 127, 217), (255, 255, 0)),  # High contrast
    ((255, 255, 255), (232, 213, 93)),  # Legacy
    ((158, 159, 167), (232, 227, 227)),  # Equinox
    ((140, 119, 147), (189, 169, 237)),  # Dark lotus
    ((253, 132, 2), (255, 53, 0)),  # Zephyr harrier
]

# Active theme to use for stripping when not given
active_theme = themes[0]


def check_range(pixel: Pixel, theme: Theme) -> bool:
    """Checks whether the given pixel is in the colour range of the given theme.

    Args:
        pixel (Pixel): The pixel to check.
        theme (Theme): The theme to use for checking.

    Returns:
        bool: If the pixel is in the theme's range.
    """

    threshold = 0.2
    min = 1 - threshold
    max = 1 + threshold

    # Colours any
    for colour in theme:
        matches = True
        # Colour all
        for i, c in enumerate(colour):
            if not (c * min <= pixel[i] <= c * max):
                matches = False
                break
        if matches:
            return True
    return False


def detect_theme(image: Image) -> Theme:
    """Detect the active Warframe theme from the given image.

    This function works by checking the primary colour in the reward text area in the image.
    As the reward text should be the primary colour of the theme, that colour should be the
    most consistent colour throughout the region. If the colour does not match a known theme,
    a custom theme with that colour as the range is returned.

    Args:
        image (Image): The image to detect the active theme in.

    Returns:
        Theme: The active theme.
    """

    from parser import get_bottom_line_rewards  # ugh

    # Get numpy array of bottom line of rewards
    array = np.array(get_bottom_line_rewards(image))

    # Create view of array and get unique counts
    array = array.view(np.dtype((np.void, array.dtype.itemsize * array.shape[2])))
    unique, counts = np.unique(array, return_counts=True)

    # It's a byte string for some reason, so turn it back into an int
    most_common = np.frombuffer(unique[np.argmax(counts)], dtype=np.uint8)

    # Exact check primary colour
    for theme in themes:
        if (theme[0] == most_common).all():
            return theme

    # Secondary check within range
    for theme in themes:
        if check_range(most_common, theme):
            return theme

    # Custom theme with primary colour most common colour
    return (most_common,)


def strip(
    img: Image, theme: Theme = None, filter_fn: callable[[Pixel], bool] = None
) -> Image:
    """Strips the text from the given image for OCR.

    Args:
        img (Image): The image to strip.
        theme (Theme, optional): The theme to use for colour checking. Defaults to None for active theme.
        filter_fn (callable[[Pixel], bool], optional): A filter function to use instead of a theme.
            If a theme is also passed in, it is ignored in favour of the filter function. Defaults to None.

    Returns:
        Image: The modified image.
    """

    # Use filter_fn if given, else check theme colours
    if filter_fn is None:
        # Use active theme if not specified
        if theme is None:
            theme = active_theme

        def filter_fn(pxl):
            return check_range(pxl, theme)

    img_array = np.array(img)
    filter_fn_vec = np.vectorize(lambda r, g, b: filter_fn((r, g, b)))
    mask = filter_fn_vec(img_array[..., 0], img_array[..., 1], img_array[..., 2])
    output_array = np.ones_like(img_array) * 255  # Full white array
    output_array[mask] = 0, 0, 0  # Set matching to black

    return Img.fromarray(output_array.astype("uint8"))


def init(image: Image) -> None:
    """Initialises the theme module for the given image.

    This should be called every time a new image is used.

    Args:
        image (Image): The image to load this module for.
    """

    global active_theme
    active_theme = detect_theme(image)
