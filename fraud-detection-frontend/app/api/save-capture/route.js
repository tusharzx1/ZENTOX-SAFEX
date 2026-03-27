import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CAPTURES_DIR = path.join(process.cwd(), "public", "user_captures");
const LOG_FILE = path.join(process.cwd(), "user_captures.json");

// Ensure the captures directory exists
function ensureDir() {
    if (!fs.existsSync(CAPTURES_DIR)) {
        fs.mkdirSync(CAPTURES_DIR, { recursive: true });
    }
}

// Load existing log or start fresh
function loadLog() {
    if (fs.existsSync(LOG_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
        } catch {
            return [];
        }
    }
    return [];
}

export async function POST(request) {
    try {
        const { imageData, location } = await request.json();

        if (!imageData) {
            return NextResponse.json({ error: "No image data provided" }, { status: 400 });
        }

        ensureDir();

        // Generate a unique filename using timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `face_${timestamp}.png`;
        const filepath = path.join(CAPTURES_DIR, filename);

        // Strip data URL prefix and save as PNG
        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
        fs.writeFileSync(filepath, base64Data, "base64");

        // Append to JSON log
        const log = loadLog();
        const entry = {
            id: log.length + 1,
            filename,
            location: location || "Unknown",
            timestamp: new Date().toISOString(),
            imagePath: `/user_captures/${filename}`,
        };
        log.push(entry);
        fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), "utf-8");

        return NextResponse.json({ success: true, entry });
    } catch (error) {
        console.error("Save capture error:", error);
        return NextResponse.json({ error: "Failed to save capture", details: error.message }, { status: 500 });
    }
}
