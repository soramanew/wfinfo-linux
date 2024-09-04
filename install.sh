#!/bin/fish

cd (dirname (status filename)) || exit

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
            echo "Link $link_path already exists to $(realpath $link_path). Remove existing link to install."
        else
            echo "Link already created. Ignoring."
        end
    else
        # Install link
        echo "Installing link from $real_path to $link_path"
        ln -s $real_path $link_path
    end
end

# Install completions
set -q XDG_DATA_HOME && set data_dir $XDG_DATA_HOME || set data_dir ~/.local/share
set completions_dir $data_dir/fish/generated_completions
mkdir -p $completions_dir
echo "Installing fish completions to $completions_dir"
cp -r completions/. $completions_dir
