#! /bin/bash
set -e

git fetch -p

function showTags {
  LATEST_TAG=$(git describe --tags `git rev-list --tags --max-count=1`)
  echo "latest tag is $LATEST_TAG"
}

case $1 in
  help | --help )
    echo "creates a given tag and pushes it to github to trigger deployment on travis"
    echo "usage:"
    echo "  ./release.sh help | --help : displays this help"
    echo "  ./release.sh tag | tags : shows the latest release tag"
    echo "  ./release.sh 0.0.1 : releases version 0.0.1"
    showTags
    exit 0
    ;;
  tags | tag )
    showTags
    exit 0
    ;;
esac

if [[ $1 =~ ^([0-9]+\.){2}[0-9]+$ ]]; then
  echo "releasing...."
  git checkout master
  git pull -r
  
  git tag -s $1 -m "release $1"
  git push origin $1
else 
  echo "version has to be in format 0.0.0"
  showTags
  exit 1
fi
