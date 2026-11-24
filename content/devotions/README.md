# Daily devotion list

`devotions.json` is the list the home card rotates. One entry is shown to every player on a given America/Chicago date.

Each entry has:

- `id`: stable, unique, lowercase (`sample-jos-1-8`)
- `reference`: API.Bible passage id, same shape as `passageId` (`JOS.1.8` or `PRO.3.5-PRO.3.6`)
- `image`: file name in `public/devotion/` (`coast.webp`)

Do not put verse wording in this file. The server loads NKJV text through the scripture cache. Do not add a thought field.

The file shipped here is a sample of seven references (`status` is `sample`). Replace `entries` with the full list when it is ready, then set `status` to `approved`. `npm run validate-content` checks unique ids, passage ids, and that each image file exists.
