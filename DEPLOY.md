# Deploy the simulator

This app is a **static site**. There is no build command, no package install, no server
code and no database. Deployment means putting `index.html`, `css/`, `js/` and the small
supporting files on an HTTPS host.

The repository already contains:

- `.github/workflows/pages.yml` — GitHub Actions workflow that publishes the site.
- `.nojekyll` — tells GitHub Pages not to process the files with Jekyll.
- `.gitignore` — keeps OS noise, logs and local exports out of the repository.

---

## 1. Put the code on GitHub

### 1a. Install Git (one time)

Git is not currently installed on this machine. Install **Git for Windows** from
<https://git-scm.com/download/win> and accept the defaults. Open a **new** PowerShell
window afterwards so `git` is on `PATH`.

Verify:

```powershell
git --version
```

### 1b. Create an empty repository

1. Sign in to <https://github.com>.
2. **New repository**.
3. Name it, for example `minigrid-epc-simulator`.
4. Choose **Private** if the training content is commercially sensitive, otherwise
   **Public**.
5. Do **not** add a README, `.gitignore` or licence — the project already has them.
6. Create the repository and copy its HTTPS URL.

> GitHub Pages on a **private** repository requires a paid GitHub plan. On the free plan,
> either make the repository public or use Netlify/Cloudflare Pages (both support private
> repositories on their free tiers).

### 1c. Commit and push

Open PowerShell in this folder and run the commands below. Replace the placeholders.

```powershell
cd "C:\Users\USER\Documents\Default Project"

git init
git add -A
git commit -m "Mini-Grid EPC Simulator v0.3.0"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Git will ask you to authenticate. The easiest route on Windows is the **Git Credential
Manager** bundled with Git for Windows: a browser window opens, you sign in to GitHub,
and the credential is stored securely. A personal access token also works if you prefer
HTTPS tokens.

Check the result:

```powershell
git status
git log --oneline -1
```

### 1d. No command line? Use GitHub Desktop or the web uploader

- **GitHub Desktop** — <https://desktop.github.com/>. Add the existing folder, publish
  the repository, then push.
- **Web upload** — on the empty repository page choose **uploading an existing file** and
  drag the whole folder contents in. This is fine for the first upload but awkward for
  later updates. The Actions workflow still runs after the commit.

---

## 2. Turn on GitHub Pages

1. Open the repository on GitHub.
2. **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Go to the **Actions** tab and open **Deploy static site to GitHub Pages**.
5. If it has not started, click **Run workflow** and select `main`.
6. Wait for the green check. The deployment URL appears in the workflow summary and in
   **Settings → Pages**.

The site is normally live at:

```text
https://YOUR-USERNAME.github.io/YOUR-REPO/
```

Every push to `main` redeploys automatically. No build minutes are consumed beyond the
short upload/deploy job.

### Custom domain (optional)

1. In **Settings → Pages → Custom domain**, enter the domain (for example
   `simulator.example.com`) and save.
2. At your DNS provider, add a `CNAME` record pointing to
   `YOUR-USERNAME.github.io`.
3. Wait for the DNS check, then enable **Enforce HTTPS**.
4. GitHub stores the domain in a `CNAME` file in the repository. Do not delete it.

---

## 3. Alternative hosts

All of these work because the app is static. Use the repository root as the publish
directory and leave the build command empty.

| Host | Settings |
| --- | --- |
| **Netlify** | Add new site → Import from Git → build command empty → publish directory `/` |
| **Cloudflare Pages** | Connect the repository → framework preset **None** → build command empty → output directory `/` |
| **Vercel** | Import the repository → framework preset **Other** → build command empty → output directory `./` |
| **Azure Static Web Apps** | Deploy from GitHub → app location `/` → no API, no build |
| **Any web server** | Copy the folder to the document root. Serve over HTTPS. |

For a quick internal demo you can also drag the folder into Netlify Drop
(<https://app.netlify.com/drop>) without connecting GitHub.

---

## 4. Test the deployed site

Run through this list on the live HTTPS URL:

- [ ] Landing page loads with no console errors.
- [ ] **Start training** opens setup; all four playable projects, seven condition presets
      and six dropdowns work.
- [ ] A training week can be advanced and the save survives a page reload.
- [ ] **Live ops** shows the clock, season, work in progress and crew.
- [ ] **Account & settings** opens; dark, light and system themes switch.
- [ ] **PDF report** opens the print view with the competency profile and turning points.
      Allow pop-ups for the site the first time.
- [ ] **Planning mode** runs 2,000 simulations and the PDF analysis opens.
- [ ] The site works on a phone width and on a projector.

Browser `localStorage` is scoped to the origin. A session created at
`http://localhost:8765` will **not** appear at `https://YOUR-USERNAME.github.io/...`, and
vice versa. Export a JSON debrief before moving between origins if you need the record.

---

## 5. Updating the deployment

```powershell
cd "C:\Users\USER\Documents\Default Project"
git add -A
git commit -m "Describe the change"
git push
```

The workflow redeploys in about a minute. If the old page is cached, hard-refresh with
`Ctrl+F5` (Windows) or check the deployment URL from the latest workflow run.

---

## 6. Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| 404 at the Pages URL | **Settings → Pages → Source** is not set to **GitHub Actions**, or the workflow failed. Open the Actions log. |
| Blank page, 404s for `css/` or `js/` | File names are case-sensitive on Linux. Keep `css/app.css` and `js/main.js` exactly as committed. |
| Old version still shows | Browser cache or a failed deployment. Hard-refresh; check the latest workflow run. |
| PDF does nothing | The browser blocked the print window. Allow pop-ups for the site, then retry. |
| Theme resets between machines | Preferences are local to each browser profile by design. There is no account server. |
| `git` is not recognised | Install Git for Windows, then open a new terminal. |
| Push rejected (`non-fast-forward`) | The remote has commits you do not have. Pull with `git pull --rebase origin main`, resolve, then push. |

---

## 7. Important limits

- There is **no authentication**. Anyone with the URL can open the app. Do not put
  confidential client data into a public deployment.
- There is **no server-side storage**. Sessions, profiles and preferences live in the
  browser. Clearing site data removes them.
- PDF export uses the browser's print dialog. The user chooses **Save as PDF** in the
  print destination. This is deliberate: it keeps the app dependency-free and works on
  desktop and mobile browsers.
- The app is **Level C** evidence. Hosting it does not make the model bankable. Keep the
  disclaimer and the model card visible in training.
