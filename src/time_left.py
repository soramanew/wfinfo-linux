import sys
from parser import get_scale

import pytesseract as tess
from PIL import Image

from theme import Theme

_TIME_COLOUR = 235, 235, 235
_TIME_SIZE = 54
_TIME_TOP = 400  # center - top = real top


if __name__ == "__main__":
    with Image.open(sys.argv[1]) as image:
        # Crop to number
        scale = get_scale(image)
        size = _TIME_SIZE * scale
        left = (image.width - size) / 2
        top = image.height / 2 - _TIME_TOP * scale
        cropped = image.crop((left, top, left + size, top + size))

        # Strip everything but text
        Theme.strip(cropped, filter_fn=lambda pxl: pxl >= _TIME_COLOUR)

        # Tesseract OCR image to string, psm 7 == single line, whitelist numbers only
        config = "--psm 7 -c tessedit_char_whitelist='1234567890'"
        string = tess.image_to_string(cropped, config=config).strip()

        # Print result for other scripts to use if valid, otherwise no output
        if string.isdigit():
            print(string)
