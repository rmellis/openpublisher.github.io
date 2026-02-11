# 📘 Open Publisher – User Guide

Welcome to **Open Publisher**! This is a lightweight, web-based desktop publishing tool that allows you to create documents, flyers, brochures, and fun designs on any device in any modern browser.

## 📑 Table of Contents
1. [The Interface Overview](#1-the-interface-overview)
2. [File Management](#2-file-management-saving--exporting)
3. [Core Editing Concepts](#3-core-editing-concepts)
4. [Working with Text](#4-working-with-text)
5. [Working with Images & Graphics](#5-working-with-images--graphics)
6. [Page Design & Layout](#6-page-design--layout)
7. [Multi-Page Documents](#7-multi-page-documents)
8. [Templates](#8-templates)
9. [Ribbon Reference (Detailed Tab Breakdown)](#9-ribbon-reference-detailed-tab-breakdown)
10. [Keyboard Shortcuts](#10-keyboard-shortcuts)

---

## 1. The Interface Overview

If you’ve spent any time on a computer over the past 20 years, this layout will feel instantly familiar<br>
— it’s look's inspired by Microsoft's Office, when it looked at it's best.

<img  alt="Open Publisher's Main Window" src="https://github.com/user-attachments/assets/9cead72a-9ba2-457d-bc1d-e7eb88c72ec8" />

* **Title Bar:** Displays the document name (click to rename), Undo/Redo controls, and mouse coordinates.
* **Ribbon Menu:** The tabbed area at the top (`Home`, `Insert`, `Page Design`, etc.) containing all tools.
* **Sidebar (Left):** Shows thumbnails of your pages. Use this to add, delete, or switch pages.
* **Canvas (Center):** Your workspace/paper.
* **Status Bar (Bottom):** Shows tool status and page count.
* **Zoom Controls (Bottom Right):** Quick toggles for zooming (60% - 150%).

---

## 2. File Management (Saving & Exporting)

Everything related to opening, saving, printing, and keeping your work safe is located in the **File Tab**.

<img alt="File Tab" src="https://github.com/user-attachments/assets/cab74ff3-690e-41a8-b46f-9e8fdc441983" />

### Key Operations:
* **New Project:** Click **New** to wipe the canvas and start fresh.
    > ⚠️ **Warning:** Unsaved changes will be lost.
* **Save as PDF:** Click the **PDF** button to render your current page as a high-quality image inside a PDF file.
* **Save Source (Important):** Click **Save Source** to download a `.json` file. **This is your "Master File."** Keep this to edit your text or move objects later.
* **Open Source:** Upload a `.json` file to resume working on a previous project.
* **Print:** Opens your browser's print dialog (formatted to hide the interface and print only the paper).

---

## 3. Core Editing Concepts

Before designing, it helps to know how to interact with the page (found mostly in the **Home Tab**).

<img alt="Gome Tab" src="https://github.com/user-attachments/assets/1baf6223-e32e-42c0-89a6-d77526a78917" />

* **Selection:** Click once on any object to select it.
* **Movement:** Drag an object to move it.
* **Resize:** Drag the **white square handles** on the corners or edges.
    * *Tip:* Dragging a handle past the opposite edge will "flip" (mirror) the object.
* **Rotate:** Use the **Green Handle** sticking out of the top of a selection to rotate it.
* **Layering:** Use **Front** and **Back** buttons in the Home tab to move objects behind or in front of others.
* **Clipboard:** Standard **Copy** and **Paste** buttons are available (shortcuts `Ctrl+C` / `Ctrl+V` work too).

---

## 4. Working with Text

### Inserting Text
Go to the **Insert Tab** and click **Text Box**. A new box will appear on the canvas.

<img alt="insert tab with text box" src="https://github.com/user-attachments/assets/f655626e-b94a-4f08-b5cb-c6cb72c31ba9" />

### Formatting Text
There are two ways to format text:
1.  **The Home Tab:** Use the Font Picker (60+ Google Fonts), Size input, and Bold/Italic/Underline buttons.
2.  **The Floating Toolbar:** When you select a text object, a small toolbar appears next to it for quick access to fonts, colors, and alignment.

### WordArt
For headlines, go to **Insert > WordArt**. This opens a gallery of 60 pre-styled graphical text effects (3D, gradients, shadows).

<img alt="WordArt Gallery" src="https://github.com/user-attachments/assets/c736f229-39e1-44e4-a11c-403c2e1efa42" />

---

## 5. Working with Images & Graphics

### Inserting Graphics
Go to the **Insert Tab** to find:
* **Picture:** Upload JPG/PNG files from your computer.
* **Clipart:** Insert high-quality vector icons (Twemoji).
* **Shapes:** Insert geometry (Circles, Stars) or outlines (Arrows, Callouts).
* **Ads:** Insert pre-made marketing stickers (e.g., "Sale", "50% Off").

### The Picture Tab (Contextual)
When you select an image, a new **Picture Tab** appears in the ribbon.

<img alt="Picture tab" src="https://github.com/user-attachments/assets/e3090f8a-a88c-4199-871b-92e31dc94301" />

* **Recolor:** Apply filters like Grayscale, Sepia, or Color Tints.
* **Corrections:** Auto-adjust brightness and contrast.
* **Crop Tool:**
    1. Click **Crop**.
    2. Drag the handles to resize the "frame".
    3. Drag the image to move it *inside* the frame.
    4. Click Crop again to apply.

---

## 6. Page Design & Layout

Use the **Page Design Tab** to change the look of the paper itself.

<img alt="Page Design tab" src="https://github.com/user-attachments/assets/07474d1c-223b-4356-ae1e-415971463a46" />

* **Size & Orientation:** Switch between A4/Letter and Portrait/Landscape.
* **Margins:** Toggle blue dotted lines (guides) to help you align content.
* **Page Borders:** Apply borders to the page edge. Includes standard lines and **Fancy Borders** (Art Deco, Floral, Certificate).
* **Themes:** Click a color swatch in the scrolling list to instantly set the page background (Solids, Gradients, Patterns).

---

## 7. Multi-Page Documents

Open Publisher allows you to work on multiple pages within a single file.

<table border="0" cellspacing="0" cellpadding="0">
  <tr>
    <td width="300" valign="middle" style="border:none;">
      <img alt="Sidebar" src="https://github.com/user-attachments/assets/99c5962a-567f-42d8-9fe3-098d0211ec03" width="100%" />
    </td>
    <td valign="middle" style="border:none;">
      <ul>
        <li><b>Sidebar Navigation:</b> Click a thumbnail to switch pages.</li>
        <li><b>Add Page:</b> Click <b>+ Add Page</b> to create a blank sheet.</li>
        <li><b>Delete Page:</b> Hover over a thumbnail and click the <b>Red X</b>.</li>
        <li><b>Headers & Footers:</b> Every page has a dedicated Header and Footer area. Text typed here is specific to that page.
          <ul>
             <li><i>Toggle visibility via Page Design &gt; H/F Toggle.</i></li>
          </ul>
        </li>
      </ul>
    </td>
  </tr>
</table>

---

## 8. Templates

Need inspiration? Go to **File > Templates**.

<img alt="Templates Gallery" src="https://github.com/user-attachments/assets/91fa7dac-59ad-4da1-bb94-2e228c8a059c" />

Browse categories like Resumes, Flyers, Menus, and Certificates.
> 📝 **Note:** Loading a template will replace the content of your **currently selected** page.

---

## 9. Ribbon Reference (Detailed Tab Breakdown)

Here is a specific breakdown of every button in the interface.

### 🏠 Home Tab
* **Common:** Shortcuts for PDF Export and Saving.
* **Clipboard:** Paste, Copy, Cut.
* **Font:** Font Family, Size, Bold, Italic, Underline, and Color Picker.
* **Editing:** Select All.
* **Arrange:** Bring to Front, Send to Back, Delete.

### ➕ Insert Tab
* **Illustrations:** Text Box, Picture (Upload), Clipart (Gallery).
* **Graphics:** Shapes (Solid & Outlines), WordArt.
* **Marketing:** Ad templates.
* **Tables:** Grid picker to insert editable tables.

### 🎨 Page Design Tab
* **Page Setup:** Margins Toggle, Orientation, Size.
* **Layout:** Borders (Basic & Fancy), Header/Footer Toggle.
* **Themes:** Background color/pattern selector.

### 👁️ View Tab
* **Zoom:** Presets (60%, 75%, 100%, 150%).
* **Show:**
    * **Margins:** Visual print guides.
    * **Rulers:** Top and Left measurement rulers.
    * **Grid:** Graph paper overlay.
    * **Baselines:** Notebook line overlay.

### 🔎 Review Tab
* **Proofing:**
    * **Spelling:** Turn on the red squiggly lines of judgment.
    * **Thesaurus:** Opens external reference.

---

## 10. Keyboard Shortcuts

| Shortcut | Function |
| :--- | :--- |
| **Ctrl + Z** | Undo |
| **Ctrl + Y** | Redo |
| **Ctrl + C** | Copy selected element |
| **Ctrl + V** | Paste copied element |
| **Delete** | Delete selected element |
| **Ctrl + Wheel** | Zoom In/Out |
| **Esc** | Deselect all elements |
| **Ctrl + +** | Zoom In |
| **Ctrl + -** | Zoom Out |
| **Ctrl + 0** | Reset Zoom to 100% |
