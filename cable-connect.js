const connectBtn = document.getElementById('connect-btn');
const statusDiv = document.getElementById('status');

// 1. Helper function to update the UI
function updateDeviceStatus(device, isConnected) {
  if (isConnected) {
    statusDiv.innerHTML = `<strong>Connected:</strong> ${device.productName || 'Unknown Device'} (Vendor ID: ${device.vendorId})`;
  } else {
    statusDiv.innerHTML = 'Device disconnected.';
  }
}

// 2. Request permission to connect to a new device
connectBtn.addEventListener('click', async () => {
  try {
    // This opens the browser's native USB device picker prompt
    const device = await navigator.usb.requestDevice({ filters: [] }); 
    
    // Open a session with the device
    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);
    
    updateDeviceStatus(device, true);
  } catch (error) {
    console.error('USB Connection Error:', error);
    statusDiv.innerText = `Connection failed: ${error.message}`;
  }
});

// 3. Listen for devices that disconnect
navigator.usb.addEventListener('disconnect', (event) => {
  console.log('Device disconnected:', event.device);
  updateDeviceStatus(event.device, false);
});

// 4. Listen for devices that connect (only triggers if previously approved by the user)
navigator.usb.addEventListener('connect', async (event) => {
  console.log('Device connected:', event.device);
  try {
    await event.device.open();
    updateDeviceStatus(event.device, true);
  } catch (error) {
    console.error('Failed to auto-reconnect:', error);
  }
});

// 5. Optional: Check for already paired devices on page load
window.addEventListener('DOMContentLoaded', async () => {
  const pairedDevices = await navigator.usb.getDevices();
  if (pairedDevices.length > 0) {
    // Automatically use the first already-approved device if it's plugged in
    try {
      await pairedDevices[0].open();
      updateDeviceStatus(pairedDevices[0], true);
    } catch (e) {
      console.log('Paired device found but offline.');
    }
  }
});
