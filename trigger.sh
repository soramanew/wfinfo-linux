#!/bin/fish

pgrep -f 'ags -b wfinfo' && ags -b wfinfo -r 'trigger();'
