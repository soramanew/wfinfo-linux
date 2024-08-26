import sys
from parser import get_num_rewards

from PIL import Image

if __name__ == "__main__":
    with Image.open(sys.argv[1]).convert("RGB") as image:
        print(get_num_rewards(image))
