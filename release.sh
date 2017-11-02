#! /bin/bash
set -e

case $1 in
  help | --help )
    echo "creates a given tag and pushes it to github to trigger deployment on travis"
    echo "usage:"
    echo "  ./release.sh 0.0.1"
    exit 0
    ;;
esac

if [[ $1 =~ ^([0-9]+\.){2}[0-9]+$ ]]; then
  echo "releasing...."
  git fetch -p
  git checkout master
  git pull -r
  
  git tag -s $1 -m 'release $1'
  git push origin $1
else 
  echo "version has to be in format 0.0.0"
  exit 1
fi
