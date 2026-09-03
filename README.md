# Figma Parametrized PDF Generator

[Русская версия](README.ru.md)

![Example](image.png)

## Goal

This local tool automates repetitive work in Figma. For example, you have two Frame templates and an Excel table, for example with 100 rows. Each row contains data for one accounting report. Instead of copying Frames and replacing text by hand, the plugin inserts the data, creates a PDF, and moves to the next row.

Each PDF contains two pages because the two selected Frames become the two pages. Example output:

```text
report_001.pdf
report_002.pdf
output.zip
```

Everything runs locally. No database, account, or cloud service is required.

## 1. Mark up the two Figma Frames

1. Open your Figma file.
2. Prepare two Frames. The first becomes page one and the second becomes page two.
3. Wherever data should appear, type a placeholder inside double curly braces:

```text
Company: {{company_name}}
Period: {{report_period}}
Revenue: {{revenue}} RUB
Expenses: {{expenses}} RUB
Profit: {{profit}} RUB
```

4. Use only Latin letters, numbers, and `_` inside placeholder names.
5. A placeholder may appear many times and may be used on both Frames.
6. Format the placeholder with the desired color, font, and weight. The plugin preserves its style and the formatting around it.

## 2. Prepare Excel

1. Create an `.xlsx` file.
2. Put column names in the first row.
3. A column name must exactly match the placeholder without its braces.
4. Each following row becomes one PDF.

Example:

| company_name | report_period | revenue | expenses | profit |
|---|---|---:|---:|---:|
| Example Ltd | January 2026 | 5 460 000 RUB | 3 100 000 RUB | 2 360 000 RUB |
| Sample Inc | February 2026 | 6 100 000 RUB | 3 700 000 RUB | 2 400 000 RUB |

Do not leave a header empty and do not use duplicate column names.

## 3. Install and run

Open PowerShell in the project folder and run this once:

```powershell
python -m pip install -r requirements.txt
cd figma-plugin
npm install
npm run build
cd ..
```

Start the local bridge and keep the terminal open:

```powershell
python generate.py
```

Then in Figma:

1. Hold `Shift` and select exactly two Frames.
2. Open `Plugins > Development > Import plugin from manifest...`.
3. Choose `figma-plugin/manifest.json`.
4. Run the plugin.
5. Click the only upload button: `Upload Excel`.
6. Choose the `.xlsx` file in the system dialog. It uploads automatically.
7. The plugin checks the placeholders and Excel columns.
8. Click `Preview row 1`.
9. If the preview is correct, click `Generate all`.

PDF files appear in `output` as `report_001.pdf`, `report_002.pdf`, and so on. When generation finishes, `output.zip` appears in the project root.

## Troubleshooting

- `Please select exactly two template Frames.`: select exactly two Frame nodes.
- `Please upload an .xlsx file`: choose an Excel file with the `.xlsx` extension.
- `Missing Excel column: profit`: add a `profit` column to the first Excel row.
- After plugin changes, run `npm run build` and restart the plugin.
- If the plugin cannot connect, check that `python generate.py` is running and its window is open.
