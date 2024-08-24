from __future__ import annotations

from enum import Enum

from PIL.Image import Image


class Theme(Enum):
    _THRESHOLD = 0.2

    # TODO theme detection
    # Primary colour, secondary colour
    VITRUVIAN = (190, 169, 102), (245, 227, 173)
    STALKER = (153, 31, 35), (255, 61, 51)
    BARUUK = (238, 193, 105), (236, 211, 162)
    CORPUS = (35, 201, 245), (111, 229, 253)
    FORTUNA = (57, 105, 192), (255, 115, 230)
    GRINEER = (255, 189, 102), (255, 224, 153)
    LOTUS = (36, 184, 242), (255, 241, 191)
    NIDUS = (140, 38, 92), (245, 73, 93)
    OROKIN = (20, 41, 29), (178, 125, 5)
    TENNO = (9, 78, 106), (6, 106, 74)
    HIGH_CONTRAST = (2, 127, 217), (255, 255, 0)
    LEGACY = (255, 255, 255), (232, 213, 93)
    EQUINOX = (158, 159, 167), (232, 227, 227)
    DARK_LOTUS = (140, 119, 147), (189, 169, 237)
    ZEPHYR = (253, 132, 2), (255, 53, 0)

    @classmethod
    def _check_range(cls, pixel: tuple[int, int, int], theme: Theme) -> bool:
        """Checks whether the given pixel is in the colour range of the given theme.

        Args:
            pixel (tuple[int, int, int]): The pixel to check.
            theme (Theme): The theme to use for checking.

        Returns:
            bool: If the pixel is in the theme's range.
        """

        min = 1 - cls._THRESHOLD.value
        max = 1 + cls._THRESHOLD.value

        # Colours any
        for colour in theme.value:
            matches = True
            # Colour all
            for i in range(3):
                if not (colour[i] * min <= pixel[i] <= colour[i] * max):
                    matches = False
                    break
            if matches:
                return True
        return False

    @classmethod
    def strip(cls, img: Image, theme: Theme = None) -> Image:
        """Strips the text from the given image for OCR.

        WARNING: This method modifies the passed in image.

        Args:
            img (Image): The image to strip.
            theme (Theme, optional): The theme to use for colour checking. Defaults to VITRUVIAN.

        Returns:
            Image: The same image that was passed in. This is only to allow chaining.
        """

        # Default parameters are before enum creation so not an enum if default param
        if theme is None:
            theme = cls.VITRUVIAN

        for x in range(img.width):
            for y in range(img.height):
                # Black if match else white
                if cls._check_range(img.getpixel((x, y)), theme):
                    pxl = 0, 0, 0
                else:
                    pxl = 255, 255, 255
                img.putpixel((x, y), pxl)
        return img
