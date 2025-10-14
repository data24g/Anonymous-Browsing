// my-electron-app/js/src/renderer.js
document.addEventListener("DOMContentLoaded", async () => {
  const profileList = document.getElementById("profile-list");
  const addProfileButton = document.getElementById("addProfileButton");
  const profileFormModal = document.getElementById("profile-form-modal");
  const closeButton = document.querySelector(".close-button");
  const profileForm = document.getElementById("profileForm");
  const saveProfileButton = document.getElementById("saveProfileButton");
  const cancelProfileButton = document.getElementById("cancelProfileButton");
  const formTitle = document.getElementById("formTitle");

  const profileIdInput = document.getElementById("profileId");
  const profileNameInput = document.getElementById("profileName");
  const browserTypeSelect = document.getElementById("browserType");
  const userAgentInput = document.getElementById("userAgent");
  const proxyInput = document.getElementById("proxy");
  const widthInput = document.getElementById("width");
  const heightInput = document.getElementById("height");
  const timezoneInput = document.getElementById("timezone");
  const platformInput = document.getElementById("platform");
  const startUrlInput = document.getElementById("startUrl");

  const statusMessage = document.getElementById("status-message");

  let currentProfiles = [];

  // --- Hàm hiển thị/cập nhật danh sách profile ---
  async function renderProfiles() {
    currentProfiles = await window.api.loadProfiles();
    profileList.innerHTML = "";

    if (currentProfiles && currentProfiles.length > 0) {
      currentProfiles.forEach((profile) => {
        const li = document.createElement("li");
        li.className = "profile-item";
        li.innerHTML = `
                    <span class="profile-name">${profile.name} (${profile.browserType})</span>
                    <div class="profile-actions">
                        <button class="open-profile-btn" data-id="${profile.id}">Open</button>
                        <button class="edit-profile-btn" data-id="${profile.id}">Edit</button>
                        <button class="delete-profile-btn" data-id="${profile.id}">Delete</button>
                    </div>
                `;
        profileList.appendChild(li);
      });
    } else {
      profileList.innerHTML =
        '<li class="no-profiles">No profiles yet. Click "Add New Profile" to create one.</li>';
    }
  }

  // --- Hàm mở form profile ---
  function openProfileForm(profile = null) {
    profileForm.reset(); // Reset form
    if (profile) {
      formTitle.textContent = "Edit Profile";
      profileIdInput.value = profile.id;
      profileNameInput.value = profile.name;
      browserTypeSelect.value = profile.browserType;
      userAgentInput.value = profile.userAgent;
      proxyInput.value = profile.proxy || "";
      widthInput.value = profile.width || 1920;
      heightInput.value = profile.height || 1080;
      timezoneInput.value = profile.timezone || "Asia/Ho_Chi_Minh";
      platformInput.value = profile.platform || "Win32";
      startUrlInput.value = profile.startUrl || "https://bot.sannysoft.com/";
    } else {
      formTitle.textContent = "Create New Profile";
      profileIdInput.value = Date.now().toString(); // ID mới cho profile mới
      // Thiết lập giá trị mặc định cho profile mới
      userAgentInput.value =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";
      browserTypeSelect.value = "chromium";
      widthInput.value = 1920;
      heightInput.value = 1080;
      timezoneInput.value = "Asia/Ho_Chi_Minh";
      platformInput.value = "Win32";
      startUrlInput.value = "https://bot.sannysoft.com/";
    }
    profileFormModal.style.display = "block";
  }

  // --- Hàm đóng form profile ---
  function closeProfileForm() {
    profileFormModal.style.display = "none";
  }

  // --- Event Listeners ---

  // Load profiles khi ứng dụng khởi động
  renderProfiles();

  addProfileButton.addEventListener("click", () => openProfileForm());
  closeButton.addEventListener("click", closeProfileForm);
  cancelProfileButton.addEventListener("click", closeProfileForm);

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const profile = {
      id: profileIdInput.value,
      name: profileNameInput.value,
      browserType: browserTypeSelect.value,
      userAgent: userAgentInput.value,
      proxy: proxyInput.value,
      width: parseInt(widthInput.value),
      height: parseInt(heightInput.value),
      timezone: timezoneInput.value,
      platform: platformInput.value,
      startUrl: startUrlInput.value,
    };
    await window.api.saveProfile(profile);
    closeProfileForm();
  });

  profileList.addEventListener("click", (event) => {
    const target = event.target;
    const profileId = target.dataset.id;
    const profile = currentProfiles.find((p) => p.id === profileId);

    if (target.classList.contains("open-profile-btn")) {
      if (profile) {
        statusMessage.textContent = `Opening profile: ${profile.name}...`;
        window.api.openBrowserProfile(profile);
      }
    } else if (target.classList.contains("edit-profile-btn")) {
      if (profile) {
        openProfileForm(profile);
      }
    } else if (target.classList.contains("delete-profile-btn")) {
      if (
        profile &&
        confirm(`Are you sure you want to delete profile "${profile.name}"?`)
      ) {
        window.api.deleteProfile(profileId);
      }
    }
  });

  // --- Lắng nghe phản hồi từ Main Process ---
  window.api.onBrowserLaunchedSuccess((event, arg) => {
    statusMessage.textContent = `✅ ${arg.message}`;
    console.log(arg.message);
  });

  window.api.onBrowserLaunchedError((event, arg) => {
    statusMessage.textContent = `❌ ${arg.message}`;
    console.error(arg.message, arg.details);
  });

  window.api.onProfileSaved(async (event, arg) => {
    statusMessage.textContent = `✅ ${arg.message}`;
    console.log(arg.message);
    await renderProfiles(); // Cập nhật danh sách sau khi lưu
  });

  window.api.onProfileDeleted(async (event, arg) => {
    statusMessage.textContent = `✅ ${arg.message}`;
    console.log(arg.message);
    await renderProfiles(); // Cập nhật danh sách sau khi xóa
  });
});
