#!/bin/fish

cd (dirname (status filename)) || exit

function output -a text
    set_color cyan
    # Pass arguments other than text to echo
    echo $argv[2..] -- ":: $text"
    set_color normal
end

if which yay >/dev/null
    output 'Installing dependencies via yay...'
    yay -S --needed python tesseract-data-eng tesseract aylurs-gtk-shell-git dart-sass grim wlr-randr wmctrl
end

# Link main script to local PATH if in PATH
set bin_path ~/.local/bin
if contains $bin_path $PATH
    mkdir -p $bin_path
    set -l link_path $bin_path/wfinfo
    set -l real_path (realpath wfinfo)

    # Link already exists
    if test -L $link_path
        # Link is not to this file
        if test "$(realpath $link_path)" != "$real_path"
            output "Link $link_path already exists to $(realpath $link_path). Remove existing link to install."
        else
            output "Link already created. Ignoring."
        end
    else
        # Install link
        output "Installing link from $real_path to $link_path..."
        ln -s $real_path $link_path
    end
end

# Install completions
set -q XDG_DATA_HOME && set data_dir $XDG_DATA_HOME || set data_dir ~/.local/share
set completions_dir $data_dir/fish/generated_completions
mkdir -p $completions_dir
output "Installing fish completions to $completions_dir..."
cp -r completions/. $completions_dir

output 'Done!'
