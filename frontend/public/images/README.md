# Local portfolio image references

Portfolio entries use images served from this directory with root-relative paths such as `/images/gathering-study.svg`. The admin API currently accepts only the three checked-in SVG studies listed in `backend/lib/catalog.ts`. This keeps references local, avoids third-party hotlinks, and prevents publishing a broken or unreviewed asset. To add another approved image, add the file here and add its exact path to the backend allowlist before using it in the admin form.

The existing illustrations are sample artwork. Keep entries marked as sample until real work is supplied and approved.
