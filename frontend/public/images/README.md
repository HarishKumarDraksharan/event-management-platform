# Local portfolio image references

Portfolio entries and homepage slides use images served from this directory with root-relative paths such as `/images/gathering-study.svg`. The admin APIs currently accept only the three checked-in SVG studies listed in `backend/lib/catalog.ts` and `backend/lib/hero-slides.ts`. This keeps references local, avoids third-party hotlinks, and prevents publishing a broken or unreviewed asset. To add another approved image, add the file here and add its exact path to the appropriate backend allowlist before using it in an admin form.

The existing illustrations are sample artwork. Keep entries marked as sample until real work is supplied and approved.
