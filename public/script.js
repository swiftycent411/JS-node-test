document.addEventListener("DOMContentLoaded", function() {
    console.log("JavaScript is working!");
});

/*document.addEventListener("DOMContentLoaded", function () {
    const contactForm = document.getElementById("contact-form");

    if (contactForm) {
        contactForm.addEventListener("submit", async function (event) {
            event.preventDefault(); // Prevent default form submission

            // Get form data
            const formData = new FormData(contactForm);
            const name = formData.get("name");
            const email = formData.get("email");
            const message = formData.get("message");

            // Prepare data for API request
            const payload = { name, email, message };

            try {
                // Send data to the server
                const response = await fetch("/submit-form", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const result = await response.text(); // Read server response

                if (response.ok) {
                    alert("✅ Message sent successfully!");
                    contactForm.reset(); // Clear form fields
                } else {
                    alert(`❌ Error: ${result}`);
                }
            } catch (error) {
                console.error("Error submitting form:", error);
                alert("❌ Error submitting form. Please try again.");
            }
        });
    }
});*/

document.addEventListener("DOMContentLoaded", function () {
    // Check if we're on the Admin page
    if (document.querySelector("body.admin-page")) {
      console.log("✅ Admin page detected. Fetching responses...");
  
      fetch("/fetch-responses")
        .then(response => response.json())
        .then(data => {
          console.log("✅ Responses Fetched:", data);
  
          // Get the target element
          const targetElement = document.querySelector("body > main > p");
  
          if (!targetElement) {
            console.error("❌ Target element not found!");
            return;
          }
  
          // Clear previous content
          targetElement.innerHTML = "";
  
          // Create a table element
          const table = document.createElement("table");
          table.border = "1";
          table.style.borderCollapse = "collapse";
          table.style.marginTop = "10px";
  
          // Create table headers
          const headerRow = table.insertRow();
          ["Survey ID", "Respondent ID", "Contact", "Email", "Response Memo", "Completed Date"].forEach(text => {
            const th = document.createElement("th");
            th.textContent = text;
            th.style.padding = "5px";
            th.style.border = "1px solid black";
            headerRow.appendChild(th);
          });
  
          // ✅ Group responses by RespondentId
          const groupedResponses = {};
  
          data.forEach(response => {
            const respondentId = response.RespondentId;
            if (!groupedResponses[respondentId]) {
              groupedResponses[respondentId] = {
                SurveyId: response.SurveyId,
                RespondentId: respondentId,
                Contact: "",
                Email: "",
                ResponseMemo: "",
                CompletedDate: response.CompletedDate || "N/A"
              };
            }
  
            // ✅ Assign values based on AnswerId
            if (response.AnswerId === "101317") {
              groupedResponses[respondentId].Contact = response.ResponseText || "";
            }
            if (response.AnswerId === "101316") {
              groupedResponses[respondentId].Email = response.ResponseText || "";
            }
            if (response.AnswerId === "101315") {
              groupedResponses[respondentId].ResponseMemo = response.ResponseMemo || response.ResponseText || "";
            }
          });
  
          // ✅ Loop through grouped responses and append rows
          Object.values(groupedResponses).forEach(response => {
            const row = table.insertRow();
            ["SurveyId", "RespondentId", "Contact", "Email", "ResponseMemo", "CompletedDate"].forEach(key => {
              const cell = row.insertCell();
              cell.textContent = response[key] || "N/A";
              cell.style.padding = "5px";
              cell.style.border = "1px solid black";
            });
          });
  
          // Append the table to the target element
          targetElement.appendChild(table);
        })
        .catch(error => console.error("❌ Error fetching responses:", error));
    }
  });
