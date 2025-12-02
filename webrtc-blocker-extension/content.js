// Simple WebRTC blocking content script
(function() {
    'use strict';
    
    console.log('🔒 WebRTC Blocker content script loaded');
    
    // Block RTCPeerConnection
    if (window.RTCPeerConnection) {
        window.RTCPeerConnection = function() {
            console.warn('RTCPeerConnection blocked');
            throw new Error('WebRTC is disabled');
        };
    }
    
    // Block getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
        navigator.mediaDevices.getUserMedia = function() {
            console.warn('getUserMedia blocked');
            return Promise.reject(new Error('Camera/Microphone access disabled'));
        };
    }
    
    // Remove webdriver flag
    if (navigator.webdriver !== undefined) {
        delete navigator.webdriver;
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false
        });
    }
    
    console.log('✅ WebRTC blocking enabled');
})();