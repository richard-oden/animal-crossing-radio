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

    // Remove focus class from all items in list:
    function removeFocus(list) {
        for (let item of list) {
            item.classList.remove("autocomplete-focus");
        }
    }

    // Add focus class:
    function addFocus(list) {
        if (list) {
            removeFocus(list);
            // Bounds checking:
            if (currentFocus >= list.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (list.length - 1);

            list[currentFocus].classList.add("autocomplete-focus");
        }
    }

    // Display results when user starts typing:
    input.addEventListener("input", () => {
        closeAllLists();
        if (input.value) {
            currentFocus = -1;
            const list = document.createElement('ul');
            list.id = input.id + '-autocomplete-list';
            list.className = 'autocomplete-items';
            const matchingItems = arr.filter(item => item.toLowerCase().includes(input.value.toLowerCase()));
            matchingItems.length === 0 ? list.innerHTML += '<div class="result">No results found. :(</div>' :
                matchingItems.forEach(matchingItem => list.innerHTML += `<li class="result">${matchingItem}</li>`);
            input.parentNode.appendChild(list);
        }
    });

    // Change input value when item is clicked:
    input.parentNode.addEventListener('click', event => {
        if (event.target.tagName == 'LI') {
            input.value = event.target.textContent;
            closeAllLists();
        }
    });

    // Navigate items with keyboard:
    input.addEventListener("keydown", event => {
        var list = document.getElementById(input.id + "-autocomplete-list");
        if (list) {
            items = list.children;
            if (event.key == 'ArrowDown') {
                currentFocus++;
                addFocus(items);
            } else if (event.key == 'ArrowUp') {
                currentFocus--;
                addFocus(items);
            } else if (event.key == 'Enter') {
                event.preventDefault();
                if (currentFocus > -1 && items) items[currentFocus].click();
            }
        }
    });

    // If user clicks elsewhere, close all lists:
    document.addEventListener("click", event => closeAllLists(event.target));
}