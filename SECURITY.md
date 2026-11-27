# Security

## Reporting a problem

Please report security problems **privately**, through GitHub: on this repository's **Security** tab, choose **Report a vulnerability**. Please don't open a public issue.

Include what you found, how to reproduce it and which part it affects (the Moodle plugin, the WordPress plugin or the demo). You'll get a reply within a week. Fixes are released as new plugin versions, and reporters are credited unless they'd rather not be.

## Supported versions

Only the latest release of each plugin gets security fixes.

| Part | Latest |
|---|---|
| Moodle plugin (`mod_toybox`) | 0.5.x |
| WordPress plugin | 0.1.x |

## How ToyBox keeps toys contained

Toys are HTML and JavaScript written by teachers (often with AI), so ToyBox treats them as untrusted:

- **Sandboxed frames.** Every toy runs in `<iframe sandbox="allow-scripts">` without `allow-same-origin`, so it has an opaque origin: it can't read the host page, cookies, storage or session, and can't open pop-ups.
- **No network.** A Content-Security-Policy allows only the toy's own inline code and the ToyBox SDK: no `fetch`, WebSockets, external scripts, images, fonts or form posts. In Moodle and WordPress each toy has its own address (`toy.php` / `?toybox_frame=`) and the policy is an HTTP header, which code in the toy can't remove. Pages don't contain toy code.
- **Navigation.** Browsers can't stop a sandboxed frame navigating itself, which could carry data out in the address. ToyBox detects it, stops the toy at once and (in Moodle) logs an event. The editor's checker flags navigation, outside links, password fields and WebRTC before a toy is saved.
- **A small message protocol.** Toys can only ask the player to pause, play, seek, resize, log, or report that they're finished with a small JSON result (8 KB at most). Every message is validated.
- **Video sites.** YouTube, Vimeo and Panopto are driven by messages to their own frames; none of their scripts run in the host page, and only messages from the right frame and site are accepted.
- **Moodle.** Writing toy code needs `mod/toybox:edittoys` (flagged as an XSS risk). Every change is kept with who made it, saves are logged with a fingerprint of the code, toys restored from another site are held back until reviewed, and admins can allow only the bundled toys.

## Known limits

- **Completion isn't assessment.** Results come from code in the learner's browser, so a learner who knows how can report a toy as finished. Use Moodle quizzes for anything that counts.
- **WebRTC** may be usable inside a sandboxed frame in some browsers; the checker flags it, and teachers' toys should be reviewed like any other teaching content.
