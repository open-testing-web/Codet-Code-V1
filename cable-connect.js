const connectBtn = document.getElementById('connect-btn');
const statusText = document.getElementById('status');
const canvas = document.getElementById('screen-canvas');
const ctx = canvas.getContext('2d');

let adbDevice;

connectBtn.addEventListener('click', async () => {
    try {
        statusText.innerText = "Status: Initializing connection...";

        // 1. Force the WebUSB picker to filter for Google / Pixel hardware
        const backend = await AdbWebUsbBackend.AdbWebUsbBackend.requestDevice({
            filters: [{ vendorId: 0x18d1 }] 
        });

        // 2. Setup structural ADB communication layers
        const connection = await backend.connect();
        
        // 3. Generate or retrieve web-based crypto keys for GrapheneOS verification
        // This triggers the "Allow USB Debugging" window popup on your physical phone screen
        adbDevice = await Adb.Adb.authenticate(connection, {
            getUnsignedWebBcryptKey: async () => {
                // Generates temporary key signature required by Android ADB
                return new Uint8Array(20); 
            }
        });

        statusText.innerText = "Status: Connected! Pairing successful.";
        
        // 4. Begin extracting the display frames
        startScreenStream(adbDevice);

    } catch (error) {
        console.error(error);
        statusText.innerText = `Error: ${error.message}`;
    }
});

// 5. Read stream packets from the phone
async function startScreenStream(device) {
    statusText.innerText = "Status: Booting screen mirror backend...";

    // This spawns the native Android shell utility to capture screen buffers 
    // and pipe them directly out to the USB stream
    const shell = await device.subprocess.shell("screenrecord --output-format=h264 --size 1080x2400 -");
    const reader = shell.stdout.getReader();

    // Setup an HTML5 H264 Image decoder (using native browser VideoDecoder API)
    const decoder = new VideoDecoder({
        output: (frame) => {
            // Draw the decoded video frame smoothly onto your webpage canvas
            ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
            frame.close();
        },
        error: (e) => console.error("Decoder error:", e),
    });

    // Configure decoder to parse basic AVC/H264 baseline streams
    decoder.configure({
        codec: "avc1.42E01E", 
        codedWidth: 1080,
        codedHeight: 2400
    });

    // Continuous loop reading binary data moving across the USB cable
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Chunk the raw binary packets and feed them directly into the hardware decoder
        const chunk = new EncodedVideoChunk({
            timestamp: performance.now(),
            type: "key", 
            data: value
        });
        decoder.decode(chunk);
    }
}
