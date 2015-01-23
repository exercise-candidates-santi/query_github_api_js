var buttonGenerator = {
    getRandomInt: function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    generateBegin: function (medium, current, end, nums) {
        var l = nums.length - 1;
        for (var i = 1; i < l; i++) {
            if (i <= medium) {
                nums[i] = i === current ? "-" + i + "-" : i;
            } else if (i === medium + 1) {
                nums[i] = "...";
            } else {
                nums[i] = end - (l - 1 - i);
            }
        }
        console.log(nums, "begin", current);
    },
    generateEnd: function (medium, current, end, nums) {
        var l = nums.length - 2;
        for (var i = l; i >= 1; i--) {
            if (i >= medium) {
                nums[i] = end === current ? "-" + end + "-" : end;
                end--;
            } else if (i === medium - 1) {
                nums[i] = "...";
            } else {
                nums[i] = i;
            }
        }
        console.log(nums, "end", current);
    },
    generatePlain: function (current, total, nums) {
        var l = nums.length - 1;
        for (var i = 1; i < l; i++) {
            if (i === current) {
                nums[i] = "-" + i + "-";
            } else {
                if (i > total) {
                    nums[i] = null;
                } else {
                    nums[i] = i;
                }
            }
            //nums[i] = i === current ? "-" + i + "-" : i;
        }
        console.log(nums, "plain", current);
    },
    generateMedium: function (medium, current, total, nums) {
        var l = nums.length - 2,
                before = medium - 1,
                after = medium + 1;
        nums[medium] = "-" + current + "-";
        nums[before] = "...";
        nums[after] = "...";
        for (var i = 1; i < before; i++) {
            nums[i] = i;
        }
        for (var i = l; i > after; i--) {
            nums[i] = total - (l - i);
        }
        console.log(nums, "medium", current);
    },
    generateButtonPositions: function (total, max, current) {
        var l = max + 2,
                medium = (function () {
                    if (max % 2 === 0) {
                        max--;
                    }
                    return Math.floor(max / 2) + 1;
                })(),
                nums = new Array(max + 2),
                beggining = current <= medium,
                ending = medium > total - current;

        nums[0] = "<<";
        nums[l - 1] = ">>";
        if (total <= max) {
            generatePlain(current, total, nums);
        } else {
            if (beggining) {
                generateBegin(medium, current, total, nums);
            } else if (ending) {
                generateEnd(medium, current, total, nums);
            } else {
                generateMedium(medium, current, total, nums);
            }
        }

    }
}


var total = getRandomInt(1, 34);
var max = 7;
var current = getRandomInt(2, total);
//generateButtonPositions(total, max, current);
var tp = 100;
for (var i = 1; i <= tp; i++) {
    buttonGenerator.generateButtonPositions(tp, 7, i);
}
//generateButtonPositions(34, 7, 31);
//generateButtonPositions(34, 7, 30);
/*for (var i = 1; i < 5; i++) {
 generateButtonPositions(34, 7, i);
 }
 
 for (var i = 34; i > 31; i--) {
 generateButtonPositions(34, 7, i);
 }
 generateButtonPositions(5, 7, 5);*/
//generateButtonPositions(34, 7, 18)
    