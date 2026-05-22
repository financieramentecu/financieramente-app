# Delta for business-supports

## MODIFIED Requirements

### Requirement: Allowed MIME Types

The system MUST accept `image/jpeg`, `image/png`, `image/webp`, and `application/pdf` as valid comprobante MIME types. Any other MIME type MUST be rejected.
(Previously: only image/jpeg, image/png, image/webp were accepted; application/pdf was rejected.)

#### Scenario: Upload image comprobante — unchanged happy path

- GIVEN a user attempts to upload a file with MIME type `image/jpeg`, `image/png`, or `image/webp`
- WHEN the presign API validates the content type via `isAllowedMime()`
- THEN the upload is permitted and a presigned URL is returned

#### Scenario: Upload PDF comprobante — new happy path

- GIVEN a user attempts to upload a file with MIME type `application/pdf`
- WHEN the presign API validates the content type via `isAllowedMime()`
- THEN the upload is permitted and a presigned URL is returned

#### Scenario: Upload rejected MIME type

- GIVEN a user attempts to upload a file with an unsupported MIME type (e.g. `application/docx`)
- WHEN the presign API validates the content type
- THEN the request is rejected with an error and no presigned URL is returned

#### Scenario: File size limit applies to PDFs

- GIVEN a user attempts to upload a PDF file exceeding MAX_BYTES (10 MB)
- WHEN `validateUpload()` is called
- THEN the upload is rejected with a size error

---

### Requirement: Extension Mapping

The system MUST map `application/pdf` to the `.pdf` extension via `extensionFor()`. All existing image extension mappings MUST remain unchanged.
(Previously: only image MIME types had extension mappings; application/pdf was not mapped.)

#### Scenario: PDF extension resolution

- GIVEN a MIME type of `application/pdf`
- WHEN `extensionFor('application/pdf')` is called
- THEN the return value is `'.pdf'`

#### Scenario: Image extension resolution — unchanged

- GIVEN a MIME type of `image/jpeg`
- WHEN `extensionFor('image/jpeg')` is called
- THEN the return value is `'.jpg'`

---

### Requirement: Upload Modal File Acceptance

The `UploadComprobanteModal` MUST accept PDF files in the file picker in addition to the existing image types. The UI copy and icon MUST communicate that PDFs are also supported.
(Previously: the ACCEPT attribute listed only image/jpeg, image/png, image/webp; PDFs were not selectable.)

#### Scenario: PDF selectable in file picker

- GIVEN the upload modal is open
- WHEN the user opens the file picker
- THEN files with `.pdf` extension are selectable alongside image files

#### Scenario: Non-supported file types remain excluded

- GIVEN the upload modal is open
- WHEN the user opens the file picker
- THEN files with unsupported types (e.g. `.docx`, `.xlsx`) are not selectable by default

---

### Requirement: Comprobante Thumbnail in Sidebar

The comprobante sidebar MUST display a `<FileText>` icon as thumbnail for PDF comprobantes. Image comprobantes MUST continue to display the existing `<img>` thumbnail.
(Previously: all comprobantes displayed an `<img>` thumbnail regardless of MIME type.)

#### Scenario: PDF comprobante shows document icon

- GIVEN a comprobante with `mimeType === 'application/pdf'` is listed in the sidebar
- WHEN the sidebar renders
- THEN a `<FileText>` icon is shown in place of an image thumbnail

#### Scenario: Image comprobante shows image thumbnail — unchanged

- GIVEN a comprobante with an image MIME type is listed in the sidebar
- WHEN the sidebar renders
- THEN an `<img>` element with the presigned URL is shown as the thumbnail

---

### Requirement: Inline Comprobante Preview

When a user selects a comprobante in `BusinessSupportsSheet`, the preview area MUST render the appropriate viewer based on MIME type: `<iframe>` for PDFs, `<img>` for images. A "Ver original" anchor MUST be present for both types and MUST open the presigned URL in a new tab.
(Previously: the preview always used `<img>`; no MIME-based branching existed.)

#### Scenario: PDF selected — inline iframe renders

- GIVEN a comprobante with `mimeType === 'application/pdf'` is selected
- WHEN the preview area renders
- THEN an `<iframe>` element is shown with `src` set to the presigned URL

#### Scenario: PDF selected — "Ver original" opens new tab

- GIVEN a comprobante with `mimeType === 'application/pdf'` is selected
- WHEN the user clicks "Ver original"
- THEN the presigned URL opens in a new browser tab

#### Scenario: Image selected — img preview renders — unchanged

- GIVEN a comprobante with an image MIME type is selected
- WHEN the preview area renders
- THEN an `<img>` element is shown with `src` set to the presigned URL

#### Scenario: Image selected — "Ver original" opens new tab — unchanged

- GIVEN a comprobante with an image MIME type is selected
- WHEN the user clicks "Ver original"
- THEN the presigned URL opens in a new browser tab

#### Scenario: Mobile PDF fallback

- GIVEN a PDF comprobante is selected on a mobile browser that does not render PDFs in iframes
- WHEN the preview area renders
- THEN the `<iframe>` is shown (best-effort) AND "Ver original" is always visible as a documented fallback
