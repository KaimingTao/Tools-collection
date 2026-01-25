import subprocess
import shlex
import os
from pathlib import Path


def is_git_repo(f):
    for i in f.iterdir():
        if i.name == ".git":
            return True

    return False


def list_repos(main=Path(".").resolve().iterdir()):
    repos = []
    for i in main:
        if not i.is_dir():
            continue

        if is_git_repo(i):
            repos.append(i)
            continue

        for j in i.iterdir():
            if not j.is_dir():
                continue

            if is_git_repo(j):
                repos.append(j)
    return repos


def run_command(cmd):
    process = subprocess.run(
        shlex.split(cmd), stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )

    result = process.stdout.decode() + process.stderr.decode()

    return result


# TODO add color in CLI


def up_to_date():
    repos = list_repos()

    for f in repos:
        print("Repo:", f)
        check_up_to_date(f)


def check_up_to_date(f):
    os.chdir(f)

    remote = "git remote"
    result = run_command(remote)

    if result.strip() != "origin":
        print(f"Repo {f} the remote is not origin")
        # up_remote = 'git remote rename hub origin'
        # result = run_command(up_remote)

    status = "git status"
    result = run_command(status)
    if "Changes" in result:
        print(f"Repo: {f} is edited")
        return
    elif "No commits yet" in result:
        print(f"Repo: {f} is empty")
        return

    pull = "git pull --rebase"
    result = run_command(pull)

    if result.strip() != "Already up to date.":
        print(f)
        print(result)

    # git push
    # Everything up-to-date

    # git remote
    # origin


if __name__ == "__main__":
    up_to_date()
