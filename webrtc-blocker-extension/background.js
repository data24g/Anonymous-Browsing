// Disable WebRTC non-proxied UDP
chrome.privacy.network.webRTCIPHandlingPolicy.set({
  value: 'disable_non_proxied_udp',
  scope: 'regular'
});

// Block WebRTC entirely for better privacy
chrome.contentSettings['media-stream-camera'].set({
  primaryPattern: '<all_urls>',
  setting: 'block'
});

chrome.contentSettings['media-stream-microphone'].set({
  primaryPattern: '<all_urls>',
  setting: 'block'
});

console.log('WebRTC Blocker extension loaded');