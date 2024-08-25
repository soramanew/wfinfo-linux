import json
import parser
import sys

from PIL import Image

import database as db

if __name__ == "__main__":
    with Image.open(sys.argv[1]).convert("RGB") as image:
        rewards = [{"name": r, **db.prices[r]} for r in parser.parse_image(image)]
        print(json.dumps(rewards))
        # print(max(rewards, key=lambda r: r["stats"]["price"]["platinum"]))
        # print(parser.get_num_rewards(image))