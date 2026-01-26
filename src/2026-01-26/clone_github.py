#!/usr/bin/env python3.8

from pathlib import Path
import argparse
import os
import requests
import subprocess


__version__ = "1.0"


WS = Path(__file__).resolve().parent
REPO_PATH = Path.cwd().resolve()

# V3 API
OWNER_REPO_API = (
    "https://api.github.com/user/repos"
    "?visibility=all&affiliation=owner"
    "&per_page=100"
)
GIST_API = "https://api.github.com/gists?per_page=100"


def get_token():
    with open(WS / "token.txt") as fd:
        return fd.read().strip()


def get_all_repos():
    access_token = get_token()
    headers = {"Authorization": f"token {access_token}"}
    resp = requests.get(OWNER_REPO_API, headers=headers)
    resp.raise_for_status()
    return resp.json()


def monitor_number(repos):
    if len(repos) >= 100:
        print("Total repo may be beyond 100.")
    print("#No:", len(repos))


def process_repo(repo):
    name = repo["name"]
    url = repo["ssh_url"]

    repo_path = REPO_PATH / name
    print(repo_path)

    if repo_path.exists():
        cd(repo_path)
        pull(repo_path)
    else:
        cd(REPO_PATH)
        clone(url)

    cd(WS)


def get_all_gists():
    access_token = get_token()
    headers = {"Authorization": f"token {access_token}"}
    resp = requests.get(GIST_API, headers=headers)
    resp.raise_for_status()
    return resp.json()


def process_gist(gist):
    gist_id = gist["id"]
    url = gist["git_pull_url"]

    repo_path = REPO_PATH / gist_id

    print(repo_path)

    if repo_path.exists():
        cd(repo_path)
        pull(repo_path)
    else:
        cd(REPO_PATH)
        clone(url)

    cd(WS)


def cd(repo_path):
    os.chdir(repo_path)


def clone(ssh_url):
    result = subprocess.run(
        ["git", "clone", ssh_url],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    print(result.stdout.decode("utf-8"))
    print(result.stderr.decode("utf-8"))


def pull(path):
    result = subprocess.run(
        ["git", "pull", "--rebase"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    print(result.stdout.decode("utf-8"))
    print(result.stderr.decode("utf-8"))


def parse_args():
    parser = argparse.ArgumentParser(description="Clone or update GitHub repos and gists.")
    parser.add_argument(
        "repo_path",
        nargs="?",
        default=str(Path.cwd().resolve()),
        help="Target directory for cloned repos and gists (default: current working directory).",
    )
    return parser.parse_args()


def work(repo_path):
    global REPO_PATH
    REPO_PATH = Path(repo_path).expanduser().resolve()
    REPO_PATH.mkdir(parents=True, exist_ok=True)

    repos = get_all_repos()
    print(repos)
    monitor_number(repos)
    for repo in repos:
        process_repo(repo)

    gists = get_all_gists()
    for gist in gists:
        process_gist(gist)


if __name__ == "__main__":
    args = parse_args()
    work(args.repo_path)
