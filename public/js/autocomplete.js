// This is a modifed version of the autocomplete example by w3schools:
// https://www.w3schools.com/howto/howto_js_autocomplete.asp

function autocomplete(input, arr) {
    let currentFocus; // this is used to highlight list item during keyboard navigation

    // Close all autocomplete lists except one in argument:
    function closeAllLists(listToExclude) {
        var allLists = document.getElementsByClassName("autocomplete-items");
        for (let list of allLists) {
            if (listToExclude != list && listToExclude != input) {
                list.parentNode.removeChild(list);
            }
        }
    }

    // Remove active class from all items in list:
    function removeActive(list) {
        for (let item of list) {
            item.classList.remove("autocomplete-active");
        }
    }

    // Add active class:
    function addActive(list) {
        if (list) {
            removeActive(list);
            // Bounds checking:
            if (currentFocus >= list.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (list.length - 1);

            list[currentFocus].classList.add("autocomplete-active");
        }
    }

    // Display results when user starts typing:
    input.addEventListener("input", () => {
        let val = this.value;
        closeAllLists();
        if (val) {
            currentFocus = -1;
            let itemsHTML = `<ul id='${this.id + "autocomplete-list"}' class='autocomplete-items'>`;
            arr.filter(item => item.toLowerCase().includes(val.toLowerCase()))
                .forEach(matchingItem => itemsHTML += `<li>${matchingItem}</li>`);
            itemsHTML += '</ul>';
            this.parentNode.innerHTML += itemsHTML;
        }
    });

    // Change input value when item is clicked:
    input.addEventListener('click', event => {
        if (event.target.tagName == 'LI') {
            input.value = event.target.textContent;
            closeAllLists();
        }
    });

    // Navigate items with keyboard:
    input.addEventListener("keydown", event => {
        console.log(this);
        var items = document.getElementById(this.id + "autocomplete-list").children;
        if (event.key == 'ArrowDown') {
            currentFocus++;
            addActive(items);
        } else if (event.key == 'ArrowUp') {
            currentFocus--;
            addActive(items);
        } else if (event.key == 'Enter') {
            event.preventDefault();
            if (currentFocus > -1 && items) items[currentFocus].click();
        }
    });

    // If user clicks elsewhere, close all lists:
    document.addEventListener("click", event => closeAllLists(event.target));
}