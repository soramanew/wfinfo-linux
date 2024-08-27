import json
import sys
import time
from http.client import HTTPSConnection

from platformdirs import user_cache_path

# Define resource path and ensure it exists
_RESOURCE_DIR = user_cache_path("wfinfo") / "resources"
_RESOURCE_DIR.mkdir(parents=True, exist_ok=True)

_PRICES_PATH = _RESOURCE_DIR / "prices.json"
_CHARS_PATH = _RESOURCE_DIR / "whitelist_chars.txt"
_ENDINGS_PATH = _RESOURCE_DIR / "item_endings.txt"
_WORDS_PATH = _RESOURCE_DIR / "words.txt"
_RELICS_PATH = _RESOURCE_DIR / "relics.json"

_DATA_API = "api.warframestat.us"
_UPDATE_THRESHOLD = 3600 * 4  # 4 hours
_BLUEPRINT_ENDINGS = "Systems", "Neuroptics", "Chassis", "Harness", "Wings", "Prime"

items = {}
whitelist_chars = ""
item_endings = []
words = []


def _normalise_item_name(name: str) -> str:
    """Normalises the given item's name.

    This basically just adds 'Blueprint' onto the end of the name if needed.

    Args:
        name (str): The name to normalise.

    Returns:
        str: The normalised name.
    """

    return f"{name} Blueprint" if name.split()[-1] in _BLUEPRINT_ENDINGS else name


def _get_remote_data(data: str):
    """Gets data from warframestat.us.

    Raises:
        e: The exception the request threw.

    Returns:
        Any: The requested data from the remote.
    """

    conn = HTTPSConnection(_DATA_API)
    try:
        conn.request("GET", f"/wfinfo/{data}/")
        return json.loads(conn.getresponse().read())
    except Exception as e:
        print(f"Unable to get data from {_DATA_API}/wfinfo/{data}: {e}")
        raise e
    finally:
        conn.close()


def _process_items(
    items: dict[str, dict[str, str | bool | dict[str, int | bool]]],
) -> list[str]:
    """Extracts the ducat value of every item in the given item.

    This function only rearranges the data into a nicer format while removing unneeded data.

    Args:
        items (dict[str, dict[str, str | bool | dict[str, int | bool]]]): The items to format.

    Returns:
        list[str]: The reformatted data.
    """

    ducats = {}
    for item in items:
        for part in items[item]["parts"]:
            # Ignore items with no ducat value (i.e. whole items not parts)
            # cause some items require others (e.g. Akbronco Prime requires 2 Bronco Primes)
            if "ducats" in items[item]["parts"][part]:
                ducats[_normalise_item_name(part)] = int(
                    items[item]["parts"][part]["ducats"]
                )
    return ducats


def _process_relics(relics: dict[str, dict[str, bool | str]]) -> dict:
    """Processes relic data from the remote.

    Args:
        relics (dict[str, dict[str, bool  |  str]]): The relic data.

    Returns:
        dict[str, dict[str, bool | str | dict[str, tuple[str, str, str] | tuple[str, str] | tuple[str]]]]: The processed data.
    """

    rarities = ["rare", "uncommon", "common"]

    new_relics = {}
    for tier, tier_dict in relics.items():
        new_relics[tier] = {}

        for name, relic in tier_dict.items():
            new_relic = {
                "vaulted": relic["vaulted"],
                "name": name,
                "tier": tier,
                "drops": {"common": [], "uncommon": [], "rare": []},
            }

            for n, rarity in enumerate(rarities):
                for i in range(1, n + 2):
                    r = f"{rarity}{i}"
                    # Cause raw data ignores forma
                    if r in relic:
                        drop = relic[r]
                    else:
                        drop = (
                            f"{"2 X " if rarity == "uncommon" else ""}Forma Blueprint"
                        )
                    new_relic["drops"][rarity].append(drop)
                    items[_normalise_item_name(drop)]["vaulted"] = relic["vaulted"]

            new_relics[tier][name] = new_relic

    return new_relics


def _process_prices(
    prices: list[dict[str, str]], ducats: dict[str, int]
) -> tuple[dict[str, dict[str, int | float]], str, list[str], list[str]]:
    """Processes price data from the remote.

    This function filters the items in the price data based on the ducats data and
    rearranges it into a nicer format. It also finds all characters in item names to whitelist in tesseract and
    all item endings (last word of item name) for getting the number of rewards.

    Args:
        prices (list[dict[str, str]]): The raw price data from warframestat.
        ducats (dict[str, str]): The ducat value of all items.

    Returns:
        tuple[dict[str, float | dict[str, int]], str, list[str], list[str]]: The reformatted prices, set of characters and set of item endings.
    """

    # Manually forma add cause not in price db
    words = {"2", "X", "Forma"}
    chars = set("2 X Forma")
    endings = set()
    new_prices = {
        "Forma Blueprint": {
            "price": {"platinum": 11.67, "ducats": 0},
            "sold": {"today": 0, "yesterday": 0},
        },
        "2 X Forma Blueprint": {
            "price": {"platinum": 23.33, "ducats": 0},
            "sold": {"today": 0, "yesterday": 0},
        },
    }

    for item in prices:
        # Skip item if not in ducats (filter out sets, etc)
        if item["name"] not in ducats and item["name"] + " Blueprint" not in ducats:
            continue

        # Add 'Blueprint' to item endings cause warframestat doesn't include it, also get other item endings
        ending = item["name"].split()[-1]
        if ending in _BLUEPRINT_ENDINGS:
            item["name"] += " Blueprint"
        else:
            endings.add(ending)

        # Add chars to whitelist and name words to words array
        chars |= set(item["name"])
        words.update(item["name"].split())

        # Set for prices
        new_prices[item["name"]] = {
            "price": {
                "platinum": float(item["custom_avg"]),
                "ducats": ducats[item["name"]],
            },
            "sold": {
                "today": int(item["today_vol"]),
                "yesterday": int(item["yesterday_vol"]),
            },
        }

    return new_prices, "".join(chars), list(endings), list(words)


def load_dbs() -> None:
    """Loads the databases from the cache if they exist, otherwise updates them."""

    if (
        _PRICES_PATH.exists()
        and _CHARS_PATH.exists()
        and _ENDINGS_PATH.exists()
        and _WORDS_PATH.exists()
        and _RELICS_PATH.exists()
    ):
        global items, whitelist_chars, item_endings, words, relics

        items = json.loads(_PRICES_PATH.read_text())
        whitelist_chars = _CHARS_PATH.read_text()
        item_endings = _ENDINGS_PATH.read_text().split()
        words = _WORDS_PATH.read_text().split()
        relics = json.loads(_RELICS_PATH.read_text())
    else:
        update_dbs()


def update_dbs() -> None:
    """Updates databases if they do not exist or were last updated before the threshold interval."""

    now = time.time()
    if (
        not (
            _PRICES_PATH.exists()
            and _CHARS_PATH.exists()
            and _ENDINGS_PATH.exists()
            and _WORDS_PATH.exists()
            and _RELICS_PATH.exists()
        )
        or json.loads(_PRICES_PATH.read_text())["updated"] < now - _UPDATE_THRESHOLD
    ):
        # Try get price data, if unable to then exit
        try:
            price_data = _get_remote_data("prices")
            filtered_items = _get_remote_data("filtered_items")
        except Exception:
            print("Exiting.")
            sys.exit()
        else:
            global items, whitelist_chars, item_endings, words, relics

            ducats = _process_items(filtered_items["eqmt"])
            items, whitelist_chars, item_endings, words = _process_prices(
                price_data, ducats
            )
            items["updated"] = now
            relics = _process_relics(filtered_items["relics"])

            _PRICES_PATH.write_text(json.dumps(items))
            _CHARS_PATH.write_text(whitelist_chars)
            _ENDINGS_PATH.write_text("\n".join(item_endings))
            _WORDS_PATH.write_text("\n".join(words))
            _RELICS_PATH.write_text(json.dumps(relics))


# Update dbs if called as main script otherwise load dbs
if __name__ == "__main__":
    update_dbs()
else:
    load_dbs()
