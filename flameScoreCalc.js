// For Scardor's "flame score" system.
// twitch.tv/scardor and type !flames in the chat
/* jshint esnext: true */

// Made by Sethyboy0
//
// Further edits by:
//
//
//

//  Changelog:
//
// Sometime: Made it
//
// Some time later: Added weapon flame stuff
//
// Another time:
//   Added Calculate and Reset buttons
//   Added help text
//   Move weapon flame calculator beside item flame instead of below
//
// Uhh: Weapon flame tier table
//
// I forget when these happened:
//   Moved help text to mouseover on question marks
//   Added item cards at the bottom
//   Removed secondary stat and attack type selection, can just infer it
//
// July 10th 2020:
//   Added links to flame guide, Discord, and stream
//   Use browser local storage to save class selection.
//
// July 19th 2020:
//   Updated Kanna flame stats: Kanna end game HP/MP is 1/100 instead of 1/70
//
// July 27th 2020:
//   Updated kanna flame stats to account for final m.att vs m.att.
//   lategame 1/70 -> 1/112
//   endgame 1/100 -> 1/190
//
// August 8th 2020:
//   Made weapon flame inputs save.
//   Added reset button for weapon flame.
//   Added buttons to increase/decrease number of cards:
//      Max is 30 and min is 10.
//      The number is saved in local storage.
//
// October 2nd 2020:
//  Slightly tweaked non-flame advantaged values as wiki values
//  are off for liberated kaiserium
//      Tier 3 3.625% per level bracket -> 3.626% per level bracket
//
// December 15th 2020:
//  Added my Discord to the contact info.
//  Quality of life improvements:
//    Inputs not related to your class are hidden.
//    Clicking reset sets your focus on the first relevant stat, so you can quickly enter another flame.
//    Ditto for changing main stat, changing game stage, editing a saved item card, or saving a new item card.
//    Saving an item card resets the inputs, so you can quickly enter the next item.
//    Clearing the weapon flame calc or changing the level focuses the attack input.
//
// December 22nd 2020:
//  Updated contact info section and tried to improve HTML layout to fix an issue someone was having.
//  Added error handling to help people know when shit is broken and what to do.
//
// January 24th 2021:
//   Adjusted CSS to center the calculator.
//
// April 17th 2021:
//   Adjusted contact info again.
//   More tweaks to fix abso katana t7 flame
//       Tier 7 10.246? % (fuck I already forget) -> 10.2487 %
//       (thanks whoever put that extremely specific value on strategywiki
// August 4th 2021L
//   Update Kanna values:
//     Endgame M.att

//
// Non-weapon flame score calculator
//

const statInputOrder = [
	"str",
	"dex",
	"int",
	"luk",
	"hp",
	"mp",
	"wAtt",
	"mAtt",
	"allStat",
];

function resetNumbers() {
	$("#str, #dex, #int, #luk, #hp, #mp, #wAtt, #mAtt, #allStat").val("");
	$("#nonWeapScore").text("0");
}

// To copy from.
const ezClap = {
	str: 0,
	dex: 0,
	int: 0,
	luk: 0,
	hp: 0,
	mp: 0,
	wAtt: 0,
	mAtt: 0,
};

// How much flame score each stat is worth.
const baseStatValues = {
	late: Object.assign({ allStat: 8.5 }, ezClap),
	end: Object.assign({ allStat: 9 }, ezClap),
};

// How much certain stats are worth based on game stage.
const scoreByStage = {
	late: {
		secondary: 0.125,
		attack: 4,
	},
	end: {
		secondary: 0.1,
		attack: 3,
	},
};

// Easier just to make xenon its own thing.
const xenonStatValues = {
	late: Object.assign({}, ezClap, {
		allStat: 15,
		str: 1,
		dex: 1,
		luk: 1,
		wAtt: scoreByStage.late.attack,
	}),
	end: Object.assign({}, ezClap, {
		allStat: 22,
		str: 1,
		dex: 1,
		luk: 1,
		wAtt: scoreByStage.end.attack,
	}),
};

const kannaExtraStatValues = {
	late: {
		hp: 1 / 112,
		mp: 1 / 112,
	},
	end: {
		hp: 1 / 150,
		mp: 1 / 150,
		mAtt: 2.5,
	},
};

const doubleSecondaryAllStatVal = {
	late: 9,
	end: 10,
};

function calcFlameScore(gearStats) {
	const statValues = getStatValues();

	let flameScore = 0;
	["str", "dex", "int", "luk", "hp", "mp", "wAtt", "mAtt", "allStat"].forEach(
		(stat) => {
			flameScore += gearStats[stat] * statValues[stat];
		}
	);

	// Round to nicer number.
	flameScore = Math.round((flameScore + 0.00001) * 100) / 100;
	return flameScore;
}

function updateFlameScore() {
	const gearStats = getGearStats();

	$("#nonWeapScore").text(calcFlameScore(gearStats));
}

// Map from main stat to appropriate secondary stat.
const secondaryStatMap = {
	str: "dex",
	dex: "str",
	int: "luk",
	luk: "dex",
};

function getStatValues() {
	// Late or end game.
	const gameStage = $('input[name="gameStage"]:checked').val();

	// Get character info
	const classType = $("#classType").val();

	// Start with some default values (all stat)
	const statValues = Object.assign({}, baseStatValues[gameStage]);

	// Check what kind of main stat the class uses.
	let mainStat = "";
	switch (classType) {
		case "xenon":
			// Skip the rest to make it easy.
			return xenonStatValues[gameStage];
		case "kanna":
			mainStat = "int";
			break;
		case "memeThief":
			mainStat = "luk";
			break;
		default:
			mainStat = classType;
			break;
	}
	statValues[mainStat] = 1;

	// Figure out secondary stat values
	if (classType === "memeThief") {
		statValues.str = scoreByStage[gameStage].secondary;
		statValues.dex = scoreByStage[gameStage].secondary;
		statValues.allStat = doubleSecondaryAllStatVal[gameStage];
	} else {
		const secondaryStat = secondaryStatMap[mainStat];
		statValues[secondaryStat] = scoreByStage[gameStage].secondary;
	}

	// Figure out what attack type the class uses.
	const attackType = mainStat === "int" ? "mAtt" : "wAtt";
	statValues[attackType] += scoreByStage[gameStage].attack;

	// Bonus Kanna memes.
	if (classType === "kanna") {
		Object.assign(statValues, kannaExtraStatValues[gameStage]);
	}

	return statValues;
} //getStatValues()

function getGearStats() {
	return {
		str: $("#str").val(),
		dex: $("#dex").val(),
		int: $("#int").val(),
		luk: $("#luk").val(),
		hp: $("#hp").val(),
		mp: $("#mp").val(),
		wAtt: $("#wAtt").val(),
		mAtt: $("#mAtt").val(),
		allStat: $("#allStat").val(),
	};
}

function setGearStats(stats) {
	$("#str").val(stats.str);
	$("#dex").val(stats.dex);
	$("#int").val(stats.int);
	$("#luk").val(stats.luk);
	$("#hp").val(stats.hp);
	$("#mp").val(stats.mp);
	$("#wAtt").val(stats.wAtt);
	$("#mAtt").val(stats.mAtt);
	$("#allStat").val(stats.allStat);
	updateFlameScore();
}

// Hide inputs for stats that aren't relevant with the given stat values.
function showRelevantStats() {
	const statValues = getStatValues();
	statInputOrder.forEach((stat) => {
		$(`#${stat}`).toggle(statValues[stat] !== 0);
	});
}

// Focus on the first relevant input for the given stat values.
function focusFirstRelevantInput() {
	const statValues = getStatValues();
	for (let i = 0; i < statInputOrder.length; i++) {
		const stat = statInputOrder[i];
		if (statValues[stat] !== 0) {
			$(`#${stat}`).focus();
			break;
		}
	}
}

// ----------------------------------------------
// Weapon Flame Tier calculator
// ----------------------------------------------

// Weapon Flame Tiers
const flameAdvantageWeaponTiers = [0.03, 0.044, 0.0605, 0.0799, 0.102487];

const normalWeaponTiers = [0.01, 0.022, 0.03626, 0.05325, 0.073, 0.088, 0.1025];

// Focus on the weapon attack input.
function focusWeaponAttackInput() {
	$(`#baseAttack`).focus();
}

function updatePossibleFlameTiers() {
	const calcs = calcWeaponFlameTier();
	const flameAdvantaged = $("#flameAdvantage").is(":checked");
	const tierList = calcs.tierList;

	let indexChange = flameAdvantaged ? 2 : 0;
	if (indexChange === 2) {
		$("#wt0, #wt1").html(" ");
	}
	for (let i = 0; i < tierList.length; i++) {
		$("#wt" + (i + indexChange)).html(tierList[i]);
	}

	$("#weapFlameVals").text(tierList);
}

function onWeaponFlameBtnClick() {
	const calcs = calcWeaponFlameTier();
	let flameTier = calcs.flameTier;
	$("#weapTier").text(flameTier);
	updatePossibleFlameTiers();
}

function onClearWeaponFlame() {
	const $attackInputs = $("#flameAttack, #baseAttack");
	$attackInputs.val("");
	$attackInputs.trigger("change");
	focusWeaponAttackInput();
}

function calcWeaponFlameTier() {
	const flameAdvantaged = $("#flameAdvantage").is(":checked");
	const levelMult = parseInt($("#levelRange").val());
	const baseAttack = parseInt($("#baseAttack").val());
	const flameAttack = parseInt($("#flameAttack").val());
	const baseValues = flameAdvantaged ? flameAdvantageWeaponTiers : normalWeaponTiers;

	// Find the right value.
	let flameTier = 0;
	let tierList = [];
	// To display possibilities
	baseValues.forEach((value, index) => {
		const predictedAttack = Math.ceil(levelMult * value * baseAttack) || 0;
		tierList.push(predictedAttack);
		if (flameAttack === predictedAttack) {
			flameTier = index + 1;
		}
	});

	// Flame advantaged starts at tier 3.
	if (flameAdvantaged && flameTier !== 0) {
		flameTier += 2;
	}

	return {
		flameTier: flameTier,
		tierList: tierList,
	};
}

// ----------------------------------------------
// Saved Items
// ----------------------------------------------

// To keep track of what the fuck I'm putting into the storage.
const saveDataObject = {
	name: "",
	str: 0,
	dex: 0,
	int: 0,
	luk: 0,
	hp: 0,
	mp: 0,
	wAtt: 0,
	mAtt: 0,
	allStat: 0,
};

var numCards = 10;

function loadNumCards() {
	const storage = window.localStorage;
	const storedCards = storage.getItem("numCards");
	// In case a string gets in there.
	const parsed = parseInt(storedCards);
	if (!isNaN(parsed)) {
		numCards = parsed;
	}
}

function saveNumCards() {
	const storage = window.localStorage;
	storage.setItem("numCards", numCards);
}

function initCards() {
	// Get the number of cards.
	loadNumCards();

	// Clone the card
	const firstCard = $(".itemCardTemplate");
	// Make it visible so the clones are lol.
	firstCard.show();

	// Clear container.
	const cardContainer = $("#itemCards");
	cardContainer.empty();

	for (let i = 0; i < 14; i++) {
		const card = firstCard.clone();
		card.removeClass("itemCardTemplate");
		card.addClass("itemCard" + "-" + [i + 1]);
		setupCard(card, i);
		cardContainer.append(card);
	}

	// hide original card.
	firstCard.hide();
}

function onAddCardsClick() {
	numCards += 5;
	if (numCards > 30) {
		numCards = 30;
	}
	saveNumCards();
	initCards();
}

function onRemoveCardsClick() {
	numCards -= 5;
	if (numCards < 10) {
		numCards = 10;
	}
	saveNumCards();
	initCards();
}

function makeSaveHandler(card, index) {
	return function () {
		const statFields = getGearStats();
		// Add name and flame score.
		statFields.name = card.find(".itemName").val() || "";
		// Update the card.
		const flameScore = $("#nonWeapScore").text();
		card.find(".js-score").text(flameScore || 0);
		// Save to local storage.
		window.localStorage.setItem("savedItem" + index, JSON.stringify(statFields));
		// Get user ready for next item
		resetNumbers();
		focusFirstRelevantInput();
	};
}

function makeEditHandler(index) {
	return function () {
		// Load values from storage and set the appropriate fields.
		const stats = JSON.parse(window.localStorage.getItem("savedItem" + index));
		if (!stats) {
			resetNumbers();
			return;
		}
		setGearStats(stats);
		// Get user ready for next item
		focusFirstRelevantInput();
	};
}

function makeClearHandler(card, index) {
	return function () {
		// Clear the local storage.
		window.localStorage.removeItem("savedItem" + index);
		// Reset card fields.
		card.find(".itemName").val("");
		card.find(".js-score").text(0);
	};
}

// Add click handlers and initial values to card.
function setupCard(card, index) {
	// Check for existing saved data.
	const storage = window.localStorage;
	const existingData = JSON.parse(storage.getItem("savedItem" + index));
	if (existingData) {
		card.find(".itemName").val(existingData.name || "");
		card.find(".js-score").text(calcFlameScore(existingData) || 0);
	}

	// Add button handlers.
	const saveBtn = card.find(".saveButton");
	saveBtn.on("click", makeSaveHandler(card, index));

	const editBtn = card.find(".editButton");
	editBtn.on("click", makeEditHandler(index));

	const clearBtn = card.find(".clearButton");
	clearBtn.on("click", makeClearHandler(card, index));
}

// ----------------------------------------------
// Initialization
// ----------------------------------------------

// Inputs that have their value stored.
const storedInputs = [
	"classType",
	"flameAdvantage",
	"levelRange",
	"baseAttack",
	"flameAttack",
];

function loadFromStorage(inputName) {
	const storage = window.localStorage;
	const inputValue = storage.getItem(inputName);
	if (inputValue && inputValue !== "undefined") {
		$("#" + inputName).val(inputValue);
	}
}

function storeInputChoice(inputName) {
	const storage = window.localStorage;
	const inputValue = $("#" + inputName).val();
	storage.setItem(inputName, inputValue);
}

function storeCheckbox(inputName) {
	const storage = window.localStorage;
	const inputValue = $("#" + inputName).prop("checked");
	storage.setItem(inputName, inputValue);
}

function storeRadio(inputName) {
	const storage = window.localStorage;
	const inputValue = $("input:radio[name='" + inputName + "']:checked").val();
	storage.setItem(inputName, inputValue);
}

function addSaveHandler(inputName) {
	$("#" + inputName).on("change", () => storeInputChoice(inputName));
}

// These inputs don't behave as nice, so they get their own function.
function addWeirdSaveHandlers() {
	$("input:radio[name=gameStage]").on("change", () => storeRadio("gameStage"));

	$("#flameAdvantage").on("change", () => storeCheckbox("flameAdvantage"));
}

// Checkboxes and radio buttons are weird.
function loadWeirdInputs() {
	const storage = window.localStorage;
	const gameStage = storage.getItem("gameStage");
	if (gameStage && gameStage !== "undefined") {
		$("input:radio[name=gameStage]").val([gameStage]);
	}

	const flameAdvantage = storage.getItem("flameAdvantage");
	if (flameAdvantage) {
		$("#flameAdvantage").prop("checked", flameAdvantage === "true");
		updatePossibleFlameTiers();
	}
}

// Combine the two QoL functions
function getReadyForInput() {
	showRelevantStats();
	focusFirstRelevantInput();
}

function initPage() {
	// Load input values;
	storedInputs.forEach(loadFromStorage);
	loadWeirdInputs();

	// Add handlers to save input
	storedInputs.forEach(addSaveHandler);
	addWeirdSaveHandlers();

	// Add change handlers to the inputs.
	$(
		"#classType, #str, #dex, #int, #luk, #hp, #mp, #wAtt, #mAtt, #allStat, input[name='gameStage']"
	).on("change keyup", updateFlameScore);

	const scoreTypeSelectors = $("#classType, input[name='gameStage']");
	// Add QoL handlers.
	scoreTypeSelectors.on("change", getReadyForInput);
	$("#resetBtn").on("click", getReadyForInput);

	// Reset cards on changes that require recalculating scores.
	scoreTypeSelectors.on("change", initCards);

	// Weapon flame score stuff
	$("#baseAttack, #levelRange").on("change keyup", updatePossibleFlameTiers);
	$("#levelRange").on("change", focusWeaponAttackInput);
	$("#flameAdvantage").on("click", updatePossibleFlameTiers);
	$("#flameAttack").on("change", onWeaponFlameBtnClick);

	initCards();
	showRelevantStats();
}

function handleError(err) {
	document.getElementById("errorMessage").innerHTML =
		"There was an error loading the calculator. Please contact Sethyboy0 and show him this:<br><br>" +
		err.message;
}

function ready() {
	try {
		initPage();
	} catch (err) {
		handleError(err);
	}
}

document.addEventListener("DOMContentLoaded", ready);
