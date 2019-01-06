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
        var $item = $("<div>").addClass("card pin col-sm-6 col-lg-3 item " + (repo.language || '').toLowerCase() + " " + repo.name.toLowerCase());
        var $link = $("<a>").attr("href", repoUrl(repo)).appendTo($item);
        $link.append($("<h4>").html(repo.name + "<div class='org'><a href='" + repo.owner.html_url + "'>(" + repo.owner.login + ")"));
        $link.append($("<p>").text((repo.language != null) ? repo.language : ""));
        $item.append($("<small>").text((repo.description != null) ? repo.description : ""));
        htag = "#allrepos";
        $item.appendTo(htag);
        return;
    }

    function RenderUpdatedRepo($index) {
        repo = updated[$index];
        var $item = $("<div>").addClass("card pin col-sm-6 col-lg-3 item " + (repo.language || '').toLowerCase() + " " + repo.name.toLowerCase());
        var $link = $("<a>").attr("href", repoUrl(repo)).appendTo($item);
        $link.append($("<h4>").html(repo.name + "<div class='org'><a href='" + repo.owner.html_url + "'>(" + repo.owner.login + ")"));
        $link.append($("<p>").text((repo.language != null) ? repo.language : ""));
        $item.append($("<small>").text((repo.description != null) ? repo.description : ""));
        htag = "#updated";
        $item.appendTo(htag);
        return;
    }

    function addUpdated() {
        $("#updated").empty();
        var updatedRepos = 0;
        var counter = 0;
        for (let r = 0, updatedRepos = Math.min(20, updated.length); r < updatedRepos; r++) {
            RenderUpdatedRepo(r);
            counter++;
        }
        $(".ibm_repo_header").text("Recently updated (" + counter + ") repos shown").addClass("text-center");
        $("#updated").collapse({
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
                        if (repo.fork === true) {
                            forks.push(i);
                        }
                    });

                    $.each(forks, function (i, forkindex) {
                        var indextoremove = forkindex - i;
                        if (DEBUG) console.log('removing forked entry: ' + repos[
                            indextoremove].full_name);
                        repos.splice(indextoremove, 1);
                    });

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
                    addUpdated();
                    //addAllRepos();
                });
            }
        });
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

    $("<div>").appendTo("#wrapper").append($("<div id='updated'>"));

    for (var r in orgs) {
        addRepos(orgs[r]);
    }

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

    $('body').on('click', 'a[data-analytics-category][data-analytics-action]', function (e) {
        if (!window.ga)
            return;

        if (this.hostname && this.hostname !== location.hostname) {
            e.preventDefault();
            var url = this.href;
            setTimeout(function () {
                document.location = url;
            }, 200);
        }

        var $el = $(this),
            data = {
                'hitType': 'event'
            };

        data['eventCategory'] = $el.attr('data-analytics-category');
        data['eventAction'] = $el.attr('data-analytics-action');

        if ($el.attr('data-analytics-label')) {
            data['eventLabel'] = $el.attr('data-analytics-label');
        }

        if ($el.attr('data-analytics-value')) {
            data['eventValue'] = parseInt($el.attr('data-analytics-value'));
        }
        ga('send', data);
    });

})(jQuery);
