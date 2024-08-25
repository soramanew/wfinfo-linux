#!/bin/fish

cd (dirname (realpath (status filename))) || exit

if ! test -d .venv
    python -m venv .venv
    . .venv/bin/activate.fish
    pip install -r requirements.txt
end

ags -b wfinfo -c ./ags/config.js
