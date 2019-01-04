/*
 * Add hash to the URL and reload after
 */
$(function () {
    $('#showallrepos a').click(function (e) {
        var url = $(this).attr('href');
        window.location.href = url;
        location.reload();
        e.preventDefault();
    })
})

var updated = [];
var allrepos = [];
var DEBUG = (window.location.hash === '#DEBUG'); // Not used currently
var progress = 0;

(function ($, undefined) {

    var repoUrls = {};

    function repoUrl(repo) {
        return repoUrls[repo.name] || repo.html_url;
    }

    function RenderRepo($index) {
        repo = allrepos[$index];
        var $item = $("<div>").addClass("card pin col-sm-5 col-md-4 col-lg-3 item " + (repo.language || '').toLowerCase() + " " + repo.name.toLowerCase());
        var $scrollbarOuter = $("<div>").addClass("scrollbar-outer").appendTo($item);
        var $scrollbarInner = $("<div>").addClass("scrollbar-inner").appendTo($scrollbarOuter);
        var scrollbarOuter = document.createElement('div');
        var $link = $("<a>").attr("href", repoUrl(repo)).appendTo($scrollbarInner);
        $link.append($("<h4>").html(repo.name + "<div class='org'><a href='" + repo.owner.html_url + "'>(" + repo.owner.login + ")"));
        $link.append($("<h5>").text((repo.language != null) ? repo.language : ""));
        $scrollbarInner.append($("<p>").text(repo.description != null) ? repo.description : "");
        htag = "#allrepos";
        $item.appendTo(htag);
        $scrollbarInner.css("padding-right", ($scrollbarInner[0].offsetWidth - $scrollbarInner[0].clientWidth));
        return;
    }

    function RenderUpdatedRepo($index) {
        repo = updated[$index];
        var $uitem = $("<div>").addClass("updated-card col-sm-5 col-md-4 col-lg-3");
        var $item = $("<div>").addClass("card pin " + (repo.language || '').toLowerCase() + " " + repo.name.toLowerCase());
        var $scrollbarOuter = $("<div>").addClass("scrollbar-outer").appendTo($item);
        var $scrollbarInner = $("<div>").addClass("scrollbar-inner").appendTo($scrollbarOuter);
        var $link = $("<a>").attr("href", repoUrl(repo)).appendTo($scrollbarInner);
        $link.append($("<h4>").text(repo.name));
        $link.append($("<h5>").text((repo.language != null) ? repo.language : ""));
        $scrollbarInner.append($("<p>").text(repo.description != null) ? repo.description : "");
        $item.appendTo($uitem);
        $uitem.appendTo("#updated");
        $scrollbarInner.css("padding-right", ($scrollbarInner[0].offsetWidth - $scrollbarInner[0].clientWidth));
    }

    function addUpdated() {
        $("#updated").empty();
        var updatedRepos = 0;
        for (let r = 0, updatedRepos = Math.min(4, updated.length); r < updatedRepos; r++) {
            RenderUpdatedRepo(r);
        }
        var d = $("#updated").collapse({
            toggle: true
        });
    }

    function addAllRepos() {
        $("#allrepos").empty();
        var counter = 0;
        var maxRepos = 0;
        if (window.location.hash === '#showall') {
            for (let r = 0, maxRepos = allrepos.length; r < maxRepos; r++) {
                RenderRepo(r);
                counter++;
            }
            $(".nrepos").text(": " + counter + " shown. Click 'Show fewer' to show only 20 repos");
        } else {
            for (let r = 0, maxRepos = Math.min(20, allrepos.length); r < maxRepos; r++) {
                RenderRepo(r);
                counter++;
            }
            $(".nrepos").text(": " + counter + " shown. Click 'Show more' to see other " + (allrepos.length -
                counter) + " repos");
        }
        $("#allrepos").collapse({
            toggle: true
        })
    }

    function pushRepo(repos, org) {
        var left = repos;
        var right = allrepos;
        var result = [],
            il = 0,
            ir = 0;

        while (il < left.length && ir < right.length) {
            if (left[il].name.toLowerCase() < right[ir].name.toLowerCase()) {
                result.push(left[il++]);
            } else {
                result.push(right[ir++]);
            }
        }
        allrepos = result.concat(left.slice(il)).concat(right.slice(ir));
    }

    function mergeUpdated(repos) {
        var left = repos;
        var right = updated;
        var result = [],
            il = 0,
            ir = 0;

        while (il < left.length && ir < right.length) {
            if (left[il].pushed_at > right[ir].pushed_at) {
                result.push(left[il++]);
            } else {
                result.push(right[ir++]);
            }
        }
        updated = result.concat(left.slice(il)).concat(right.slice(ir));
    }

    function addRepos(orgs, repos, page) {
        var forks = [];
        var org = orgs.name;
        repos = repos || [];
        page = page || 1;
        reposcmd = orgs.type === "repo" ? "" : "/repos";

        // There are three supported request types: org, user and repo. Syntax differs.
        if ((orgs.type !== 'org') && (orgs.type !== 'user') && (orgs.type !== 'repo')) {
            console.log('** Unknown type “' + orgs.type + '” for org “' + org +
                '” — check “orgs.js” for typo.');
            return;
        }

        // These client tokens are for a dummy app, and there is no user specific
        // information that we get, so all in all, pretty safe to expose this here.
        var uri = "https://api.github.com/" + orgs.type + "s/" + org + reposcmd +
            "?per_page=1000" +
            "&client_id=1bafa09b6086eec7afb4" +
            "&client_secret=7e6422a0a2e24f0d0ecb7521a63990b5758c9cc8";
        $.getJSON(uri, function (result) {
            if (!Array.isArray(result)) {
                result = [].concat(result);
            }
            if (result && result.length > 0) {
                repos = repos.concat(result);

                $(function () {
                    $.each(repos, function (i, repo) {
                        repo.pushed_at = new Date(repo.pushed_at);
                        // if this is a fork, save the index
                        if (repo.fork === true) {
                            forks.push(i);
                        }
                    });

                    // remove forks from the view
                    $.each(forks, function (i, forkindex) {
                        // account for prior splices
                        var indextoremove = forkindex - i;
                        if (DEBUG) console.log('removing forked entry: ' + repos[
                            indextoremove].full_name);
                        repos.splice(indextoremove, 1);
                    });

                    // pre sort by how recently the repo was modified
                    repos.sort(function (a, b) {
                        if (a.pushed_at < b.pushed_at)
                            return 1;
                        if (b.pushed_at < a.pushed_at)
                            return -1;
                        return 0;
                    });

                    mergeUpdated(repos);

                    repos.sort(function (a, b) {
                        if (a.name.toLowerCase() > b.name.toLowerCase()) {
                            return 1;
                        }
                        if (b.name.toLowerCase() > a.name.toLowerCase()) {
                            return -1
                        };
                        return 0;
                    });

                    pushRepo(repos, org);

                    // add 4 recently updated repos sorted by latest updates
                    addUpdated();

                    // add all other repos
                    addAllRepos();

                });
            }
        }).always(function () {
            updateProgress();
        });
    }

    var formatPercent = function simplePercent(x) {
        return (x * 100).toFixed(0);
    }

    var formatInt = function simpleNum(x) {
        return x.toLocaleString();
    }

    if (window.hasOwnProperty('Intl')) {
        var pctFormat = new Intl.NumberFormat([], {
            style: 'percent'
        });
        var decFormat = new Intl.NumberFormat([], {
            style: 'decimal',
            maximumFractionDigits: 0
        });

        formatPercent = function intlPercent(x) {
            return pctFormat.format(x);
        };

        formatInt = function intlNum(x) {
            return decFormat.format(x);
        };
    }

    function updateProgress() {
        progress++;

        var fract = progress / orgs.length;

        $progress.text(formatPercent(fract));

        if (progress >= orgs.length) {
            $progress.delay(1000).fadeOut();
        }
    }

    $("<div>").addClass("separator").appendTo("#wrapper");
    var $sectiontitle = $("<div>").addClass("section-title").appendTo("#wrapper");
    var $title = $("<span>").addClass('title').text("recent").appendTo($sectiontitle);
    var $item = $("<div id='updated'>").addClass("columns section collapse");
    $item.appendTo($sectiontitle);
    var $twistie = $("<a data-toggle='collapse' data-target='#updated'>").addClass("twistie showdetails");
    $twistie.appendTo($sectiontitle);

    $("<div>").addClass("separator gap").appendTo("#wrapper");
    var $sectiontitle = $("<div>").addClass("section-title").appendTo("#wrapper");
    var $title = $("<span>").addClass('title').text("repos").appendTo($sectiontitle);
    var $repos = $("<span>").addClass('nrepos').text("(0)").appendTo($title);
    var $progress = $("<span>").addClass('loading').text("0 %").appendTo($title);
    var $item = $("<div id='allrepos'>").addClass("columns section collapse");
    $item.appendTo($sectiontitle);
    var $twistie = $("<a data-toggle='collapse' data-target='#allrepos'>").addClass("twistie showdetails");
    $twistie.appendTo($sectiontitle);

    for (var r in orgs) {
        addRepos(orgs[r]);
    }

    $("<div>").addClass("separator").appendTo("#wrapper");

    /*
     * Search for $repo.name & render result
     */
    $('#search').keyup(function () {
        var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();
        $rows = $(".card")
        $rows.show().filter(function () {
            var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
            return !~text.indexOf(val);
        }).hide();

        /*
         * Update repo count based on the search
         */
        n = $rows.length;
        for (r in $rows) {
            row = $rows[r];
            style = row.style;
            if (style && style.cssText && style.cssText.match("none")) {
                n--;
            }
        }

        $rows = $(".updated-card");
        $rows.show().filter(function () {
            var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
            return !~text.indexOf(val);
        }).hide();

        m = 4;
        for (r in $rows) {
            row = $rows[r];
            style = row.style;
            if (style && style.cssText && style.cssText.match("none")) {
                m--;
            }
        }

        $(".nrepos").text("(" + (n - m) + ")");
    });

    // ---------------------------------
    // Google Analytics Event Tracking
    //
    //
    // usage: add the following attributes to links you want to track:
    //   data-analytics-category=""    REQUIRED  String   Typically the object that was interacted with (e.g. button)
    //   data-analytics-action=""      REQUIRED  String   The type of interaction (e.g. click)
    //   data-analytics-label=""       OPTIONAL  String   Useful for categorizing events (e.g. nav buttons)
    //   data-analytics-value=""       OPTIONAL  Integer  Values must be non-negative. Useful to pass counts (e.g. 4 times)
    //
    // Those are the suggested usages, but you can use the attributes how you want
    // see https://developers.google.com/analytics/devguides/collection/analyticsjs/events for more details
    //
    // EXAMPLE:
    // <a href="http://ibm.com" data-analytics-category="Leadspace button" data-analytics-action="To ibm.com">Off you go!</a>
    // ---------------------------------

    $('body').on('click', 'a[data-analytics-category][data-analytics-action]', function (e) {

        // No analytics? Bail.
        if (!window.ga)
            return;

        // for links to external sources, we need a tiny delay to have a little extra time to send to Google's servers before unload
        // 200ms is about right for enough time
        if (this.hostname && this.hostname !== location.hostname) {

            // Stop the link action
            e.preventDefault();

            // setTimeout callback is called in the window scope, so cache the url from the link now
            var url = this.href;

            // in 200ms, off you go
            setTimeout(function () {
                document.location = url;
            }, 200);
        }

        // make a new data object
        var $el = $(this),
            data = {
                'hitType': 'event'
            };

        // category (required string)
        data['eventCategory'] = $el.attr('data-analytics-category');

        // action (required string)
        data['eventAction'] = $el.attr('data-analytics-action');

        // label (optional string)
        if ($el.attr('data-analytics-label')) {
            data['eventLabel'] = $el.attr('data-analytics-label');
        }

        // value (optional int)
        if ($el.attr('data-analytics-value')) {
            data['eventValue'] = parseInt($el.attr('data-analytics-value'));
        }

        // send the data
        ga('send', data);

    });

})(jQuery);