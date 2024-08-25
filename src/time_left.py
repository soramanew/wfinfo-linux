import sys
from parser import get_scale

from PIL import Image
from tesserocr import PyTessBaseAPI

from theme import Theme

_TIME_COLOUR = 235, 235, 235
_TIME_SIZE = 54
_TIME_TOP = 400  # center - top = real top


if __name__ == "__main__":
    with Image.open(sys.argv[1]).convert("RGB") as image:
        # Crop to number
        scale = get_scale(image)
        size = _TIME_SIZE * scale
        left = (image.width - size) / 2
        top = image.height / 2 - _TIME_TOP * scale
        cropped = image.crop((left, top, left + size, top + size))

        # Strip everything but text
        stripped = Theme.strip(cropped, filter_fn=lambda pxl: pxl >= _TIME_COLOUR)

        # Tesseract OCR image to string, psm 7 == single line, whitelist numbers only
        with PyTessBaseAPI(
            path="/usr/share/tessdata",  # Manual path cause unable to autodetect
            psm=7,
            variables={"tessedit_char_whitelist": "1234567890"},
        ) as tess:
            tess.SetImage(stripped)
            string = tess.GetUTF8Text().strip()

        # Print result for other scripts to use if valid, otherwise no output
        if string.isdigit():
            print(string)
