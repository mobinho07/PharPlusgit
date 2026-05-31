document.addEventListener("DOMContentLoaded", () => {
    loadVersion();

    const btn = document.getElementById("btnUpdate");
    if (btn) {
        btn.addEventListener("click", updateApplication);
    }
});


async function loadVersion() {
    const el = document.getElementById("currentVersion");

    try {
        const res = await fetch("http://127.0.0.1:5000/api/system/version");
        const data = await res.json();

        el.textContent = data.success
            ? "Version: " + data.version
            : "Version inconnue";

    } catch (err) {
        el.textContent = "Version inconnue";
    }
}

async function updateApplication() {
    const btn = document.getElementById("btnUpdate");
    const status = document.getElementById("updateStatus");

    if (!confirm("Installer la dernière version depuis Git ?")) {
        return;
    }

    btn.disabled = true;
    btn.textContent = "Mise à jour en cours...";
    status.textContent = "";

    try {
        const res = await fetch("http://127.0.0.1:5000/api/system/update", {
            method: "POST"
        });

        const data = await res.json();

        if (data.success) {
            status.textContent =
                "✅ " + data.message + "\n\n" +
                "Git:\n" + data.git;
        } else {
            status.textContent =
                "❌ Erreur:\n" + data.error;
        }

    } catch (err) {
        status.textContent = "❌ Erreur JS: " + err.message;
    }

    btn.disabled = false;
    btn.textContent = "Vérifier et mettre à jour";
}