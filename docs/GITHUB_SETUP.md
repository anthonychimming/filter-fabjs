# Publishing Filter FabJS to GitHub

Recommended repository:

- Owner: `anthonychimming`
- Name: `filter-fabjs`
- Visibility: **Public**
- Default branch: `main`

Do not initialize the GitHub repository with a README, `.gitignore`, or licence because this project already contains those files.

## GitHub Desktop

1. Extract the project folder.
2. Open GitHub Desktop and choose **File → Add Local Repository**.
3. Select the extracted `filter-fabjs-v2.1.0-modular` folder.
4. Choose **Create a Repository** if prompted.
5. Set the repository name to `filter-fabjs` and use the existing project folder.
6. Commit the files with the message `Initial modular Filter FabJS v2.1.0`.
7. Choose **Publish repository**.
8. Make sure the repository is published as **Public** to the `anthonychimming` account.

## Command line with GitHub CLI

From the extracted project folder:

```bash
git init
git add .
git commit -m "Initial modular Filter FabJS v2.1.0"
git branch -M main
gh auth login
gh repo create anthonychimming/filter-fabjs --public --source=. --remote=origin --push
```

## Command line without GitHub CLI

First create an empty public repository named `filter-fabjs` on GitHub. Then run:

```bash
git init
git add .
git commit -m "Initial modular Filter FabJS v2.1.0"
git branch -M main
git remote add origin https://github.com/anthonychimming/filter-fabjs.git
git push -u origin main
```

## Verification

The included GitHub Actions workflow runs this command after pushes and pull requests:

```bash
npm run verify
```

It checks syntax, runs smoke tests, and builds both release formats.
