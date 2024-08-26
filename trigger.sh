#!/bin/fish

pgrep -f 'ags -b wfinfo -c' && ags -b wfinfo -r 'trigger();'
