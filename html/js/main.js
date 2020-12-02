$(document).ready(function() {

    // ===========================
    // DEFINTION OF EVENT HANDLERS
    // ===========================

    // ContextMenu event on a schedule cell
    cell_onContextMenu_handler = function(event) {
        event.preventDefault();
        return false;
    }

    // MouseDown event on a schedule cell
    cell_onMouseDown_handler = function(event) {
        var cell = event.data.cell;

        // Left button => change the cell value
        if (event.which == 1) {
            if (cell.hasClass('split'))
                var half = ((event.clientX - cell.offset().left)/cell.outerWidth() < 0.5 ? "-morning" : "-afternoon");
            else
                var half = "";
            incrementCellCode(cell, 1, half, true);
        }

        // Right button => split the cell (morning/afternoon) or merge it back (same value for the whole day)
        else if (event.which == 3) {
            changeCellSplitting(cell, true);
        }
    }

    // Click event on the name of a group
    group_onClick_handler = function(event) {
        var li = $(event.target).closest("li");
        var user_ids = event.data.user_ids;
        if ("isTrigger" in event) {
            window.location.hash = $('a', li).attr("href");
            var history = false;
        }
        else {
            var history = true;
        }
        selectUserRows(li, user_ids, history);
    }

    // Handler for Ctrl+Y
    ctrlY_handler = function(event) {
        if ($history_pos == 0) return // nothing to redo

        var next = $history[$history_pos-1];

        if (next.action_id == "change-cell-value") {
            var new_code_int = next.data.new_code_int;
            var cell = next.data.cell;
            var half = next.data.half;
            changeCellCode(cell, new_code_int, half, false);
        }

        else if (next.action_id == "select-user-rows") {
            var new_li = next.data.new_li;
            new_li.triggerHandler("click");
        }

        else if (next.action_id == "change-cell-splitting") {
            var cell = next.data.cell;
            changeCellSplitting(cell, false);
        }

        $history_pos -= 1;
        updateHistoryButtons();
    }

    // Handler for Ctrl+Z
    ctrlZ_handler = function(event) {
        if ($history_pos > $history.length - 1) return // nothing to undo

        var last = $history[$history_pos];

        if (last.action_id == "change-cell-value") {
            var old_code_int = last.data.old_code_int;
            var cell = last.data.cell;
            var half = last.data.half;
            changeCellCode(cell, old_code_int, half, false);
        }

        else if (last.action_id == "select-user-rows") {
            var old_li = last.data.old_li;
            old_li.triggerHandler("click");
        }

        else if (last.action_id == "change-cell-splitting") {
            var cell = last.data.cell;

            // first call to changeCellSplitting (and then changeCellCode) adds the 'pending' class to the cell,
            // which normally aborts the next call to changeCellCode (because all these send POST requests to the PHP backend)
            // we use JQuery implementation of Promises to run them sequentially as fast as possible
            //    several .done() callbacks can be added to the same Deferred object (e.g. result of $.post)
            //    .done() callbacks are run in the order they were added
            changeCellSplitting(cell, false)
            .done(function() {

                // below is a tricky case: undo the merge of two different codes (saved in 'old_state') into a single "unknown" code
                if (last.data.hasOwnProperty('old_state')) {
                    var old_code_int_morning = last.data.old_state[0];
                    var old_code_int_afternoon = last.data.old_state[1];
                    changeCellCode(cell, old_code_int_morning, "-morning", false)
                    .done(function() {
                        changeCellCode(cell, old_code_int_afternoon, "-afternoon", false);
                    });
                }
            });
        }

        $history_pos += 1;
        updateHistoryButtons();
    }


    // =========================================
    // DEFINITION OF HISTORY-COMPLIANT FUNCTIONS
    // =========================================

    // SHOWS ONLY A SUBSET OF ROWS IN THE SCHEDULES
    selectUserRows = function(new_li, user_ids, history=false) {

        // index of the newly selected and of the previously selected groups
        var new_li = $(new_li);
        var old_li = $("#groups li.selected");

        // highlight the selected group
        old_li.removeClass("selected");
        new_li.addClass("selected");

        // show all users
        if (user_ids.length == 0) {
            $(".user-hidden").removeClass("user-hidden");
        }

        // show a restricted group of users
        else {
            // 'user-hidden' class on <tr> is for CSS styling
            // 'user-hidden' class on <td> is for not counting hidden users in function updateTotalsForThisDay
            $('tr.row_user').map(function(index, elt) {
                var user_id = elt.id.match('_([0-9]+)$')[1];
                if (user_ids.includes(user_id)) {
                    $(elt).removeClass("user-hidden");
                    $(elt).find("td").removeClass("user-hidden");
                }
                else {
                    $(elt).addClass("user-hidden");
                    $(elt).find("td").addClass("user-hidden");
                }
            });
        };

        // updates the totals
        updateTotalsForAllDates(OPTIONS.code_to_count);

        // add the action to history
        if (history) addToHistory("select-user-rows", {old_li: old_li, new_li: new_li});
    }


    // CHANGE THE CODE NUMBER OF A GIVEN CELL IN THE DATABASE
    // UPDATE THE SCHEDULE DISPLAY ON SUCCESS
    changeCellCode = function(cell, new_code_int, half, history=false) {

        // discard the MouseDown event if the previous one is still being processed
        if (cell.hasClass('pending')) {
            return;
        }
        cell.addClass('pending');

        // retrieve the code number of the other half (if there is one)
        // and compute the compound code number to save into the database
        var new_code_int_db = new_code_int+1
        if (cell.hasClass('split')) {
            var half_is_morning = (half == "-morning");
            var other_half = half_is_morning ? "-afternoon" : "-morning";
            var other_code_int = parseCellCode(cell, other_half);

            // the cell won't appear to be split in the database if both codes are the same
            if (new_code_int_db != other_code_int) {
                if (half_is_morning)
                    var new_code_int_db = (10*(new_code_int+1)) + (other_code_int+1);
                else
                    var new_code_int_db = (10*(other_code_int+1)) + (new_code_int+1);
            }
        }

        // retrieve the date and user from the ID attribute
        var cell_id_arr = parseCellId(cell);
        var cell_id = cell_id_arr[0];
        var date_str = cell_id_arr[1];
        var user_id = cell_id_arr[2];

        // calls the backend API to change the code number
        var deferred = $.post('app.php', {'code': new_code_int_db, 'date':date_str, 'user':user_id})
             .fail(function(jqXHR) {
                      flash_ajax_error(jqXHR.responseJSON);
                  })
             .done(function(res) {
                      // add the action to history
                      if (history) {
                          var old_code_int = parseCellCode(cell, half);
                          addToHistory("change-cell-value", {old_code_int: old_code_int, new_code_int: new_code_int, half: half, cell: cell});
                      }
                      updateCellStyle(cell_id, new_code_int, half);  // updates the cell display (color, icon...)
                      updateTotalsForThisDay(date_str, 1);           // updates the totals in header and footer rows
                  })
             .always(function() {
                      cell.removeClass('pending');
                    });

        // this allows to chain calls after changeCellCode (because $.post makes it asynchronous !)
        return deferred;
    }

    // INCREMENT THE CODE NUMBER OF A GIVEN CELL IN THE DATABASE RELATIVELY TO ITS CURRENT STATE
    // UPDATE THE SCHEDULE DISPLAY ON SUCCESS
    incrementCellCode = function(cell, increment, half, history=false) {
          var old_code_int = parseCellCode(cell, half);
          var new_code_int = (old_code_int + increment) % OPTIONS.code_classes.length ;
          changeCellCode(cell, new_code_int, half, history);
    }

    // SPLIT A CELL SO THAT IT HAS TWO DIFFERENT CODES FOR MORNING/AFTERNOON
    // OR MERGE IT BACK
    changeCellSplitting = function(cell, history=false) {

        // discard the MouseDown event if the previous one is still being processed
        if (cell.hasClass('pending')) {
            return;
        }

        // add or remove the 'split' class on the <td> element
        cell.toggleClass('split');

        // when splitting a cell, we initialize morning and afternoon with the current single-cell code
        // NOTHING NEEDS TO BE DONE IN THE DATABASE FOR THE TIME BEING, THIS IS JUST DOM MANIPULATION
        if (cell.hasClass('split')) {
            // switch from one class to two classes
            var old_code_classname = cell.attr('class').match(/code-([a-z]+)/)[0];
            cell.addClass(old_code_classname+"-morning");
            cell.addClass(old_code_classname+"-afternoon");
            cell.removeClass(old_code_classname);

            // add a second identical icon in the cell (only the first time it is split)
            // it will be hidden by CSS if not needed anymore
            var i = $('i', cell);
            if (i.length == 1) {
                var i2 = i.clone();
                i2.attr('id', 'icon2'+i.attr('id').substr(4));
                i.addClass('first-icon');
                i2.addClass('second-icon');
                cell.append(i2);
            }
            // set the second icon exactly as the first one
            $('.second-icon', cell).attr('class', function(index, cls) {
                      var fa_class = $('.first-icon', cell).attr('class').match(/fa-[-a-z]+/)[0];
                      return cls.replace(/fa-[-a-z]+/, fa_class);
                  })

            if (history) addToHistory("change-cell-splitting", {cell: cell});  // add the action to history
            var deferred = null;
            cell.removeClass('pending');
        }

        // when merging a split cell, set it to "unknown" and update the database
        // ...unless morning and afternoon have the same code => NOTHING TO DO IN THE DATABASE, JUST DOM MANIPULATION
        else {
            var old_code_int_morning = parseCellCode(cell, "-morning");
            var old_code_int_afternoon = parseCellCode(cell, "-afternoon");
            var old_code_str_morning = OPTIONS.code_classes[old_code_int_morning];
            var old_code_str_afternoon = OPTIONS.code_classes[old_code_int_afternoon];
            var old_code_classname_morning = "code-"+old_code_str_morning+"-morning";
            var old_code_classname_afternoon = "code-"+old_code_str_afternoon+"-afternoon";

            if (old_code_int_morning == old_code_int_afternoon) {
                var new_code_classname = "code-"+old_code_str_morning;
                cell.addClass(new_code_classname);
                cell.removeClass(old_code_classname_morning);
                cell.removeClass(old_code_classname_afternoon);

                if (history) addToHistory("change-cell-splitting", {cell: cell});  // add the action to history
                var deferred = null;
                cell.removeClass('pending');
            }

            else {
                // ambiguous old state is forced to "unknown"
                var new_code_int = 0;
                var new_code_int_db = new_code_int+1;

                // retrieve the date and user from the ID attribute
                var cell_id_arr = parseCellId(cell);
                var cell_id = cell_id_arr[0];
                var date_str = cell_id_arr[1];
                var user_id = cell_id_arr[2];

                // the backend API needs to be called or this change will be lost
                cell.addClass('pending');
                var deferred = $.post('app.php', {'code': new_code_int_db, 'date':date_str, 'user':user_id})
                    .fail(function(jqXHR) {
                              flash_ajax_error(jqXHR.responseJSON);
                          })
                    .done(function(res) {
                              var new_code_classname = "code-"+OPTIONS.code_classes[new_code_int];
                              var new_code_iconname = "fa-"+OPTIONS.code_icons[new_code_int];

                              cell.addClass(new_code_classname);
                              cell.removeClass(old_code_classname_morning);
                              cell.removeClass(old_code_classname_afternoon);

                              $('.first-icon', cell).attr('class', function(index, cls) {
                                        return cls.replace(/fa-[-a-z]+/, new_code_iconname);
                                    })

                              // add the action to history
                              if (history) {
                                  // an extra parameter 'old_state' is necessary because any old code combination has been replaced by "unknown"
                                  var old_state = [old_code_int_morning, old_code_int_afternoon];
                                  addToHistory("change-cell-splitting", {cell: cell, old_state: old_state});
                              }
                              //......updateTotalsForThisDay().......
                          })
                    .always(function() {
                              cell.removeClass('pending');
                            });
            }
        }

        // this allows to chain calls after changeCellSplitting (because $.post can make it asynchronous !)
        return $.when(deferred);

    }


    // ==================================
    // DEFINTION OF OTHER NAMED FUNCTIONS
    // ==================================

    // HANDLE THE HISTORY OF USER ACTIONS
    var $history = [];
    var $history_pos = 0;
    addToHistory = function(action_id, data) {
        // clear the "future part" of the history before a new action is added to it
        if ($history_pos > 0) {
            $history = $history.filter(function (item, index) {
                return (index >= $history_pos);
            });
        }

        // add the new action as the first item in history and reset the current position
        $history.unshift({action_id: action_id, data: data});
        $history_pos = 0;

        // update the state of history buttons
        updateHistoryButtons();
    }

    // UPDATE THE STATUS (ENABLED OR DISABLED) OF HISTORY BUTTONS
    updateHistoryButtons = function() {
        if ($history_pos > $history.length - 1)
            $("#undo").addClass("disabled");
        else
            $("#undo").removeClass("disabled");

        if ($history_pos == 0)
            $("#redo").addClass("disabled");
        else
            $("#redo").removeClass("disabled");
    }

    // CACHE JQUERY HEAVY, REDUNDANT, UNCHANGING SELECTIONS FOR PERFORMANCE PURPOSE
    window.$jqcache = {};
    $$ = function(s) {
        if (window.$jqcache.hasOwnProperty(s)) {
            return $(window.$jqcache[s]);
        }
        var e = $(s);
        if(e.length > 0) {
            window.$jqcache[s] = e;
        }
        return e;
    }

    // RETURN THE CURRENT CELL CODE NUMBER BY PARSING ITS CLASS ATTRIBUTE
    parseCellCode = function(cell, half) {
        var re = new RegExp('code-([a-z]+)'+half);
        var code_str = cell.attr('class').match(re)[1];
        var code_int = OPTIONS.code_classes.indexOf(code_str) ;
        return code_int;
    }

    // RETURN THE CELL ID, AND THE CORRESPONDING DATE AND USER IN AN ARRAY
    parseCellId = function(cell) {
        var cell_id = cell.attr('id').substr(5);
        var cell_xy = cell.attr('id').match(/cell_([0-9]+-[0-9]+-[0-9]+)_([0-9]+)/);
        var date_str = cell_xy[1];
        var user_id = cell_xy[2];
        return [cell_id, date_str, user_id];
    }

    // UPDATE THE DISPLAY OF A GIVEN CELL TO MATCH A GIVEN CODE NUMBER
    updateCellStyle = function(cell_id, code_int, half) {

        // update the <td> class name
        $("#cell_"+cell_id).attr('class', function(i, c) {
                var re = new RegExp('code-([a-z]+)'+half);
                return c.replace(re, 'code-'+OPTIONS.code_classes[code_int]+half);
            });

        // update the <i> class name (font-awesome)
        if (half == "-afternoon")
            var icon = $("#icon2_"+cell_id);
        else
            var icon = $("#icon_"+cell_id);

        icon.attr('class', function(i, c) {
                return c.replace(/fa-[-a-z]+/, 'fa-'+OPTIONS.code_icons[code_int]);
            });
    }

    // UPDATE THE COUNTS OF CELLS WITH A GIVEN CODE NUMBER
    updateTotalsForThisDay = function(date, code_int) {

        // jQuery selectors are used to count the cells
        var code_str = OPTIONS.code_classes[code_int];
        var day_cells = $$("td[id^=cell_"+date+"_]");
        var count_both = day_cells.not(".user-hidden").filter(".code-"+code_str).length;
        var count_morning = day_cells.not(".user-hidden").filter(".code-"+code_str+"-morning").length;
        var count_afternoon = day_cells.not(".user-hidden").filter(".code-"+code_str+"-afternoon").length;
        var count = Math.max(count_both+count_morning, count_both+count_afternoon);

        // update both cells in the header and the footer rows
        var result_cells = $(".cell_total_"+date);
        result_cells.html(count);

        // a warning is displayed if <count> exceeds <OPTIONS.max_count>
        if (count > OPTIONS.max_count) {
            result_cells.prepend($('<i class="fa fa-exclamation-triangle">'));
            result_cells.addClass("warning");
        }
        else {
            result_cells.find('i').remove();
            result_cells.removeClass("warning");
        }
    }
    updateTotalsForAllDates = function(code_int) {
        $$("td[id^=header_]").map(function(index, elt) {
            var date = elt.id.substr(7);
            updateTotalsForThisDay(date, code_int);
        });
    }

    // CONVERTS A Date OBJECT INTO A STRING WITH "yyyy-m-d" FORMAT
    formatDateForSQL = function(date) {
        return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
    }

    // FLASHES AN ERROR MESSAGE AFTER A FAILED AJAX REQUEST
    flash_ajax_error = function(res) {
        var alert_html = '<div class="alert alert-danger alert-dismissible fade show" role="alert">'
                       +   '<p><strong>Une erreur est survenue !</strong></p>'
                       +   '<p class="error_msg"></p>'
                       +   '<p>Rechargez la page et contactez le webmaster si le problème persiste.</p>'
                       +   '<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
                       +     '<span aria-hidden="true">&times;</span>'
                       +   '</button>'
                       + '</div>';

        var alert = $(alert_html);
        alert.insertBefore($('.jumbotron'));
        if (res)
            $('.error_msg', alert).html(res.error + ' (code ' + res.status + ')');
        else
            $('.error_msg', alert).html("Erreur lors de l'exécution de la requête");
        alert.slideDown();
        alert.alert();
    }


    // ===================
    // PAGE INITIALIZATION
    // ===================

    // ATTACH EVENT HANDLERS FOR NAVIGATING THROUGH HISTORY
    $(document).keydown(function(e) {
        if (e.which === 89 && e.ctrlKey) {
            ctrlY_handler(e);
        }
        else if (e.which === 90 && e.ctrlKey) {
            ctrlZ_handler(e);
        }
    });
    $("#undo").click(ctrlZ_handler);
    $("#redo").click(ctrlY_handler);
    updateHistoryButtons();


    // POPULATE THE LIST OF GROUPS (IN THE COLLAPSED MENU)
    $.get("app.php?type=groups")
        .fail(function(jqXHR) {
            flash_ajax_error(jqXHR.responseJSON);
        })
        .done(function(res) {
            $.each(res.data, function(group_name, user_ids) {
                var li = $('<li><a href="#'+encodeURIComponent(group_name)+'">'+group_name+'</a></li>');
                li.click({'user_ids': user_ids}, group_onClick_handler);
                $('#groups').append(li);
            });

            // Add a button to show ALL the users
            // (implementation choice => user_ids is an empty array)
            $('#groups li:first-child').click({'user_ids': []}, group_onClick_handler);
        });


    // CREATE ONE SCHEDULE TABLE FOR EACH MONTH
    // (with one row per user)
    var today = new Date();
    var totals = [];

    $('.schedule').hide();

    $.get("app.php?type=users")
        .fail(function(jqXHR) {
            flash_ajax_error(jqXHR.responseJSON);
        })
        .done(function(res) {
            var users = res.data;
            var day_names = ['D', 'L', 'Ma', 'Me', 'J', 'V', 'S'];
            var month_names = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

            // iterating through schedules...
            for (var k=0 ; k<OPTIONS.nb_displayed_months ; k++) {
                var firstDay = new Date(today.getFullYear(), today.getMonth()+k, 1);    // first day of the schedule [Date object]
                var year = firstDay.getFullYear();                                      // year of the schedule [integer]
                var month = firstDay.getMonth()+1;                                      // month of the schedule [integer]
                var dow = firstDay.getDay();                                            // day-of-week of the first day of the schedule [integer]
                var lastDay = new Date(today.getFullYear(), (month-1)+1, 0);            // last day of the schedule [Date object]
                var daysInMonth = lastDay.getDate();                                    // number of days in the schedule [integer]

                // DOM objects for the title and the table
                var h1 = $('<h1>'+month_names[month-1]+' '+year+'</h1>');
                var div = $('<div class="schedule_container"></div>');     // container used for horizontal scrolling on small screens
                var table = $('<table class="table table-hover">');
                div.append(table);

                // iterating through rows of the k-th schedule...
                var nb_rows = users.length+3;
                for (var i=1 ; i<=nb_rows ; i++) {

                    // DOM object for the table row (first row is the header, second and last rows contain totals)
                    // + DOM object for the first column
                    if (i == 1) {
                        var trow = $('<th>');
                        trow.append($('<td class="column_users">&nbsp;</td>'));
                    }
                    else if (i == 2 || i == nb_rows) {
                        var trow = $('<tr class="row_total">');
                        trow.append($('<td class="column_users">Sur site&nbsp;&nbsp;<i class="fa fa-long-arrow-alt-right"></i></td>'));
                    }
                    else {
                        var user = users[i-3];
                        var trow = $('<tr id="row_'+year+'-'+month+'_'+user['id']+'" class="row_user">');
                        trow.append($('<td class="column_users">'+user['name']+'</td>'));
                    }

                    // iterating through columns of the k-th schedule...
                    var old_dow2 = 99;
                    for (var j=1 ; j<=daysInMonth ; j++) {
                        var dow2 = (dow+j-1) % 7;
                        var date_str = year+'-'+month+'-'+j;
                        if (dow2 > 0 && dow2 <6 && !OPTIONS.closing_days.includes(date_str)) {
                            if (td && old_dow2 > dow2) {
                                // required when the last day of the previous week is in the middle of the week
                                td.addClass('column_ldow');
                            }
                            old_dow2 = dow2;

                            var td = $('<td class="column"></td>');

                            // setting cell ID attribute and contents
                            if (i == 1) {
                                td.attr('id', 'header_'+date_str);
                                td.html(day_names[dow2]+'</br>'+j);
                            }
                            else if (i == 2 || i == nb_rows) {
                                td.attr('class', 'cell_total_'+date_str);
                            }
                            else {
                                var cell_id = date_str+'_'+user['id'];
                                td.attr('id', 'cell_'+cell_id);
                                var icon = $('<i id="icon_'+cell_id+'" class="fas"></i>');

                                td.addClass('code-'+OPTIONS.code_classes[0]);
                                icon.addClass('fa-'+OPTIONS.code_icons[0]);

                                td.on('mousedown', {'cell': td}, cell_onMouseDown_handler);
                                td.on('contextmenu', cell_onContextMenu_handler);

                                td.append(icon);
                            }

                            // adding some class names for cell styling
                            if (j == 1 || dow2 == 1) {
                                td.addClass('column_fdow');
                            }
                            if (j == daysInMonth || dow2 == 5) {
                                td.addClass('column_ldow');
                            }
                            if (j == today.getDate() && month == today.getMonth()+1 && year == today.getFullYear()) {
                                td.addClass('column_today');
                            }

                            trow.append(td);
                        }
                    }

                    // required when the last day of the month is in the middle of the week
                    td.addClass('column_ldow');

                    // appending the row to the schedule
                    table.append(trow);
                }

                // updating the page
                $('#schedule_month'+k).append(h1);
                $('#schedule_month'+k).append(div);
            }

            // UPDATE THE SCHEDULE CELLS ACCORDING TO THE DATABASE STATE
            var date1 = formatDateForSQL(new Date(today.getFullYear(), today.getMonth(), 1));
            var date2 = formatDateForSQL(new Date(today.getFullYear(), today.getMonth() + OPTIONS.nb_displayed_months, 0));

            $.get("app.php?type=planning&from="+date1+"&to="+date2)
                .fail(function(jqXHR) {
                    flash_ajax_error(jqXHR.responseJSON);
                })
                .done(function(res) {
                    $.each(res.data, function(index, planning) {
                        var cell_id = planning['date']+'_'+planning['user_id'];
                        var code_int = planning['code'];
                        if (code_int < 10) {
                            updateCellStyle(cell_id, (code_int - 1), "");
                        }
                        else {
                            var code_morning = Math.floor(code_int/10) - 1;
                            var code_afternoon = (code_int - 1) % 10;
                            changeCellSplitting($("#cell_"+cell_id), false);
                            updateCellStyle(cell_id, code_morning, "-morning");
                            updateCellStyle(cell_id, code_afternoon, "-afternoon");
                        }
                    });

                    // Compute and display the number of people on the working place
                    updateTotalsForAllDates(OPTIONS.code_to_count);

                    // Display only a subset of users if a hash is present in the URL
                    var hash = window.location.hash.substr(1);
                    if (hash) $("#groups li a:contains('"+hash+"')").parent().triggerHandler("click");

                    // ==========================================================
                    // FINALLY, NOW THAT EVERYTHING IS LOADED, SHOW THE SCHEDULES
                    $('.schedule').slideDown();
                    // ==========================================================
                });

        });

});
