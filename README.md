# Document to PDF Conversion Server

This repository contains the backend Node.js server responsible for receiving documents (like Microsoft Publisher or Word files), converting them into high-quality PDFs, and returning them to the frontend client.

This server acts as a bridge, utilizing **LibreOffice's headless mode** to handle the heavy lifting of document conversion without requiring a graphical interface.

## 📋 Prerequisites

To run this server locally or deploy it, you must have the following installed on your system:

1. **Node.js & npm:** The JavaScript runtime and package manager used to run the server and install dependencies.
2. **LibreOffice:** The open-source office suite. This server relies on the LibreOffice command-line tools (`soffice.exe`) to perform the actual file conversions. 

## ⚙️ How It Works

When the frontend sends a file to this server, it goes through a specific pipeline:

1. **File Reception:** The server uses `multer` to securely receive the uploaded file via a `POST` request and temporarily stores it in an `uploads/` directory.
2. **Headless Conversion:** It triggers a child process to run LibreOffice in the background (headless mode), commanding it to convert the uploaded `.pub` or `.docx` file into a `.pdf` inside a uniquely generated temporary folder.
3. **Base64 Encoding:** Once LibreOffice finishes, the server locates the newly created PDF and reads it into memory as a Base64 encoded string.
4. **Data Delivery:** The server bundles the original file's name and the Base64 PDF data into a JSON package and sends it back to the client application, allowing the frontend to render or download the PDF immediately.
5. **Cleanup:** Finally, the server deletes all temporary files and folders to keep the host machine's storage clean.

## 🚀 Installation & Setup

1. **Clone the repository** (or download the source code).
2. **Install dependencies:** Open your terminal in the project folder and run:
   ```bash
   npm install
   ```
   *(This will install `express`, `multer`, and `cors`)*
3. **Start the server:**
   ```bash
   node server.js
   ```
   The server will start running on `http://localhost:3000`.

## 🛠️ What to Change (Customizing for Your Environment)

If you are cloning this project to run on your own machine or a different server, you will likely need to adjust a few variables in the `server.js` file:

* **The LibreOffice Path:** Currently, the path to LibreOffice is hardcoded for a standard Windows installation:
  `const libreOfficePath = '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"'`
  * *If you are on Mac:* Change this to `"/Applications/LibreOffice.app/Contents/MacOS/soffice"`
  * *If you are on Linux:* Change this to `"libreoffice"` or `"soffice"` (depending on your distribution).
* **The Port Number:**
  The server listens on port `3000` by default. You can change `const PORT = 3000;` at the bottom of the file if you need it to run on a different port.
* **CORS Settings:**
  Currently, `app.use(cors());` allows requests from *any* origin. For a production environment, you should restrict this to your specific frontend domain for security.

## 🔒 Exposing the Server Securely (No Account Required)

If you are running this server on your local machine and need to expose it to the internet (or to a frontend hosted elsewhere) without messing with your router's port forwarding or exposing your IP address, we highly recommend using **Cloudflare Quick Tunnels** (`cloudflared`).

It provides a secure, temporary, and encrypted HTTPS URL directly to your local server for free—without needing a Cloudflare account. 

### How to use Cloudflared:

1. **Download Cloudflared:**
   Download the executable for your operating system directly from Cloudflare's official GitHub repository:
   [🔗 Cloudflared Downloads (GitHub Releases)](https://github.com/cloudflare/cloudflared/releases)
   *(For Windows, download the `cloudflared-windows-amd64.exe` file and rename it to `cloudflared.exe`)*

2. **Run your Node server:**
   Start your conversion server normally:
   ```bash
   node server.js
   ```

3. **Start the Tunnel:**
   Open a **new** terminal window in the folder where you saved `cloudflared.exe` and run the following command to bind the tunnel to your server's port:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

4. **Update Your Frontend:**
   The terminal will output a temporary URL that looks something like `https://random-words.trycloudflare.com`. 
   Copy this URL and use it in your frontend code instead of `http://localhost:3000`. 

> **⚠️ Security Note:** This temporary URL acts as a public bridge to this specific port on your machine. Anyone with the URL can access your conversion endpoint. Because it generates a random URL each time you restart the tunnel, it's excellent for development and sharing. For a permanent production environment, you should look into authenticated Cloudflare Tunnels or traditional hosting!

## 🗂️ API Endpoints

* **`POST /api/convert-pub`**: Expects a `multipart/form-data` request with a file attached under the key `pubFile`.
* **`POST /api/convert-doc`**: Expects a `multipart/form-data` request with a file attached under the key `docFile`.

**Success Response (JSON):**
```json
{
  "title": "Your_Original_File_Name",
  "pdfData": "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0Z..." 
}
```
