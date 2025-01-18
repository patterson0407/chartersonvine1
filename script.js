// Initialize the Review Carousel with custom speed
document.addEventListener('DOMContentLoaded', () => {
    const reviewCarousel = document.querySelector('#reviewCarousel');
    if (reviewCarousel) {
        new bootstrap.Carousel(reviewCarousel, {
            interval: 5000, // Carousel interval set to 5 seconds
            ride: 'carousel',
        });
    }
});

// Function to fetch and display events dynamically from a Google Sheet
async function fetchSheetData() {
    try {
        const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfjXywU6WDFTwGr2Xt5JPhKVX-AsCBLqESaQCFuokBrrjUkoF4hCV3jiHlDl50OEV270NpjsdbHl-p/pub?output=csv";
        const response = await fetch(sheetUrl);
        const csvText = await response.text();
        const events = parseCsvToObjects(csvText);

        const container = document.getElementById("events-container");
        if (!container) return;

        container.innerHTML = ""; // Clear any existing content
        events.forEach((event) => {
            const eventName = event.eventName || "Event";
            const eventNameEncoded = encodeURIComponent(eventName);
            const seatsRem = event.seatsRemaining || "0";

            // Build card with event details
            const cardHtml = `
                <div class="col-md-4">
                    <div class="card event-card mb-3">
                        <img
                            src="${event.thumbnail || 'Images/default-thumbnail.jpg'}"
                            class="card-img-top"
                            alt="${eventName} Thumbnail"
                        />
                        <div class="card-body">
                            <h5 class="card-title">${eventName}</h5>
                            <p class="event-date">Date: ${event.date || ''}</p>
                            <p class="card-text">${event.description || ''}</p>
                            <p class="mb-2">
                                Seats Remaining:
                                <span class="seats-remaining">${seatsRem}</span>
                            </p>
                            <a
                                href="checkout.html?event=${eventNameEncoded}"
                                class="btn btn-primary w-100"
                            >
                                Buy Tickets
                            </a>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML("beforeend", cardHtml);
        });
    } catch (err) {
        console.error("Error fetching/parsing sheet data:", err);
    }
}

// Parse CSV data into JavaScript objects
function parseCsvToObjects(csvText) {
    const lines = csvText
        .split("\n")
        .map((line) => line.trim())
        .filter((l) => l);

    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const rowCells = lines[i].split(",").map((cell) => cell.trim());
        const rowObj = {};
        headers.forEach((header, idx) => {
            rowObj[header] = rowCells[idx] || "";
        });
        data.push(rowObj);
    }
    return data;
}

// Handle navigation highlighting
document.querySelectorAll('.navbar .nav-link').forEach((link) => {
    if (link.href === window.location.href) {
        link.classList.add('active');
    }
});

// Dynamically load events when the page loads
document.addEventListener("DOMContentLoaded", fetchSheetData);

// Scroll to top functionality for the site
const scrollToTopButton = document.getElementById("scrollToTopButton");
if (scrollToTopButton) {
    window.addEventListener("scroll", () => {
        if (window.scrollY > 200) {
            scrollToTopButton.style.display = "block";
        } else {
            scrollToTopButton.style.display = "none";
        }
    });

    scrollToTopButton.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    });
}
