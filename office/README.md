# ToyBox for PowerPoint

Put an interactive toy on a slide: sliders, drawings, quizzes and simulations that work in the slide show. Toys are made with the same editor as Moodle and WordPress (examples, checker, **Copy AI prompt**), and **Export toy** / **Import toy** move the same toy between PowerPoint, Moodle and WordPress.

## Using it

1. **Insert → Add-ins → ToyBox** (under *My add-ins* or *Admin managed*). A ToyBox box appears on the slide.
2. Pick an example, or press **Make or edit a toy** to open the editor. Press **Save to slide** when you're done.
3. Drag and resize the box like a picture. The toy fills it.
4. In the slide show the toy is fully interactive. The **Edit toy** button only shows while editing.

The toy is saved inside the presentation, so it travels with the file. People who open the file need the ToyBox add-in too; without it, PowerPoint shows a still picture of the toy.

**Same toy in Moodle:** in the editor press **Export toy**. That downloads a `.toybox.json` file and copies it. In Moodle's *Edit toys*, press **Import toy** (or paste the copied file into *Toy code*), then save. It works the other way round too.

## Installing

The add-in is a web page that PowerPoint loads from this repository's GitHub Pages site (`https://leepee.github.io/ToyBox/office/`). Installing means giving PowerPoint the manifest file, [`manifest.xml`](manifest.xml) (also at `https://leepee.github.io/ToyBox/office/manifest.xml`).

### For everyone at the institution (IT)

A Microsoft 365 administrator deploys it once: **Microsoft 365 admin center → Settings → Integrated apps → Upload custom apps → Office Add-in**, upload `manifest.xml` (or give its URL), and choose who gets it. It then appears for those people under *Insert → Add-ins → Admin managed* in PowerPoint for Windows, Mac and the web, usually within a day.

### Just you, for trying it out

- **PowerPoint for the web:** *Insert → Add-ins → More add-ins → My add-ins → Upload My Add-in*, choose `manifest.xml`.
- **Mac:** copy `manifest.xml` into `~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef` (create the `wef` folder if needed), restart PowerPoint, then *Insert → Add-ins → My add-ins*.
- **Windows:** put `manifest.xml` in a shared network folder, add that folder in *File → Options → Trust Center → Trust Center Settings → Trusted Add-in Catalogs* (tick *Show in Menu*), restart PowerPoint, then *Insert → Add-ins → My add-ins → Shared folder*.

## Where it works

PowerPoint for Windows (Microsoft 365), PowerPoint for Mac and PowerPoint for the web. Not the iPad or phone apps. It needs an internet connection, as the add-in loads from the web.

## Safety

Toys run exactly as in Moodle: each toy is in a sandboxed frame with no network access (a content policy at the very start of the toy blocks it), can't read the presentation or anything else, and is stopped if it tries to open another page. The add-in asks PowerPoint only for permission to store the toy in the presentation (`ReadWriteDocument`).

## Hosting it yourself

To serve the add-in from your own web server instead of GitHub Pages: run `npm run build`, copy `dist/` to the server, then make a manifest pointing at it:

```bash
TOYBOX_OFFICE_URL=https://your.server/toybox/office/ node scripts/office-manifest.mjs my-manifest.xml
```

## Development

The pages are `demo/office/content.html` (the box on the slide) and `demo/office/editor.html` (the editor window), built by Vite with the demo. Sources are in `office/src/`. Open `content.html` in an ordinary browser to try it without PowerPoint: the toy is then kept in the browser instead of a presentation. `npm run build` regenerates `manifest.xml`.
