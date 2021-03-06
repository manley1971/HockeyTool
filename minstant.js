Chats = new Mongo.Collection("chats");
Times = new Mongo.Collection("times");
Kids = new Mongo.Collection("kids");
Tests = new Mongo.Collection("tests");
Refined = new Mongo.Collection("refined");

//Set up all of the places the application could land
Router.configure({
  layoutTemplate: 'ApplicationLayout'
});
// specify the top level route, the page users see when they arrive at the site
Router.route('/', function() {
  console.log("rendering root /");
  this.render("navbar", {
    to: "header"
  });
  this.render("lobby_page", {
    to: "main"
  });
});
Router.route('/timer', function() {
  console.log("rendering timer")
  this.render("navbar", {
    to: "header"
  });
  this.render("timer_page", {
    to: "main"
  });
});
Router.route('/start', function() {
  console.log("just the start button")
  this.render("navbar", {
    to: "header"
  });
  this.render("start_page", {
    to: "main"
  });
});
Router.route('/chart', function() {
  this.render("navbar", {
    to: "header"
  });
  this.render("chart", {
    to: "main"
  });
});
Router.route('/dump', function() {
  this.render("navbar", {
    to: "header"
  });
  this.render("dump", {
    to: "main"
  });
});
Router.route('/times', function() {
  this.render("navbar", {
    to: "header"
  });
  this.render("times_page", {
    to: "main"
  });
});
Router.route('/config', function() {
  this.render("navbar", {
    to: "header"
  });
  this.render("config", {
    to: "main"
  });
});


// specify a route that allows the current user to chat to another users
Router.route('/chat/:_id', function() {
  if (!Meteor.userId()) {
    console.log("Security alert: trying to chat but not logged in");
    this.render("navbar", {
      to: "header"
    });
    this.render("lobby_page", {
      to: "main"
    });
    return;
  }

  // the user they want to chat to has id equal to
  // the id sent in after /chat/...
  var otherUserId = this.params._id;
  // find a chat that has two users that match current user id
  // and the requested user id
  var filter = {
    $or: [{
      user1Id: Meteor.userId(),
      user2Id: otherUserId
    }, {
      user1Id: otherUserId,
      user2Id: Meteor.userId()
    }]
  };
  var chat = Chats.findOne(filter);
  if (!chat) { // no chat matching the filter - need to insert a new one
    Meteor.call("insertChat", Meteor.userId(), otherUserId);
    chat = Chats.findOne(filter);
  }

  chatId = chat._id;

  if (chatId) { // looking good, save the id to the session
    Session.set("chatId", chatId);
  }
  this.render("navbar", {
    to: "header"
  });
  this.render("chat_page", {
    to: "main"
  });
});

if (Meteor.isClient) {
  // set up the main template the the router will use to build pages
  Meteor.subscribe("chats");
  Meteor.subscribe("kids");
  Meteor.subscribe("tests");
  Meteor.subscribe("times");
  Meteor.subscribe("users");
  Meteor.subscribe("refined");
  ///
  // helper functions for calculating chart values
  ///
  Template.refinedtable.helpers({
    times: function() {
      return Refined.find({}, {
        sort: {
          time: 1,
          limit: 10000
        }
      });

    }
  })
  Template.timetable.helpers({
    times: function() {
      return Times.find({}, {
        sort: {
          ms: -1
        }
      });

    }
  })
  Template.timer_page.helpers({
    kids: function() {
      return Kids.find();
    },
    tests: function() {
      return Tests.find();
    }
  });

  Template.config.events({
    "click .addtest": function(e) {
      console.log("add a test" + $(".newtest").val());
      Meteor.call("insertTest", $(".newtest").val());
    },
    "click .addplayer": function(e) {
      console.log("add a PLAYER" + $(".newplayer").val());
      Meteor.call("insertPlayer", $(".newplayer").val());
    }
  });

  // The state machine is somewhat hacked to simplify. Upon refactoring,
  // this information is not needed.
  var tname = "";
  var kidNames = [];

  function GetNamesAndTask() {
    console.log("Get names and task");
    var retval = '';
    var cursor = Kids.find();
    kidNames = [];
    cursor.forEach(function(doc) {
      console.log(doc.name);
      if (doc.selected) {
        kidNames.push(doc.name);
        if (retval == '')
          retval = doc.name;
        else {
          retval += ",";
          retval += doc.name;
        }
      }
    });
    //for now let the button just say "Start" or "Stop"
    return "";
  }

  var isStart;
  Template.start_page.onRendered(function() {
    tname = Session.get("tname")
      // XXX Side effects on this console.log...
    console.log("render start and stop buttons" + GetNamesAndTask());

    if ((tname == "") || (kidNames == [])) {
      $('.bbutton').prop('disabled', true);
      $(".bbutton").html("---")
    } else {
      $('.bbutton').prop('disabled', false);
      isStart = Session.get("isStart")
      if (isStart)
        $(".bbutton").html("Start")
      else {
        $(".bbutton").html("Stop")
      }
    }
  });

  Template.start_page.events({

    "click .bbutton": function(e) {
      isStart = Session.get("isStart")
      tname = Session.get("tname")
      console.log("Adding new start/stop time from big button.")
      var d = new Date();
      if (isStart)
        Meteor.call("insertTime", kidNames, tname, "start", d.toUTCString(), d.getTime());
      else
        Meteor.call("insertTime", kidNames, tname, "stop", d.toUTCString(), d.getTime());
      isStart = !isStart;
      Session.set("isStart", isStart)
      if (isStart)
        $(".bbutton").html("Start")
      else {
        $(".bbutton").html("Stop")
      }
    }
  });

  Template.timer_page.onRendered(function() {
    console.log("render start and stop buttons");
    //       tname ="";
    //       Session.set("tname",tname);
    tname = Session.get("tname");
    isStart = Session.get("isStart")
    var tid = Session.get("tid");
    $("#" + tid).addClass("active");
    // XXX Side effects on this console.log...
    console.log("render start and stop buttons" + GetNamesAndTask());

    if ((tname == "") || (kidNames == [])) {
      $('.sbutton').prop('disabled', true);
      $('.pbutton').prop('disabled', true);
      $('.rbutton').prop('disabled', true);
      $(".sbutton").html("pick a test First before Starting")
      $(".pbutton").html("Not near needing to Stop");
    } else {
      if (isStart) {
        $('.sbutton').prop('disabled', false);
        $('.pbutton').prop('disabled', true);
        $('.rbutton').prop('disabled', false);
        $(".sbutton").html(GetNamesAndTask() + " Start");
        $(".pbutton").html(GetNamesAndTask() + " Stop");
      } else {
        $('.sbutton').prop('disabled', true);
        $('.pbutton').prop('disabled', false);
        $('.rbutton').prop('disabled', false);
        $(".sbutton").html(GetNamesAndTask() + " Start");
        $(".pbutton").html(GetNamesAndTask() + " Stop");
      }
    }
  });
  Template.timer_page.events({
    "click .dbutton": function(e) {
      dname = e.target.name;
      console.log("dname:" + dname);
      Meteor.call("removeTime", dname);
    },
    "click .tname": function(e) {
      tname = e.target.name;
      var tid = e.target.id;
      Session.set("tname", tname)
      Session.set("tid", tid);
      console.log("tname:" + tname + tid);
      $("#" + tid).siblings().removeClass("active");
      $("#" + tid).addClass("active");
      $(".sbutton").html(GetNamesAndTask() + " Start");
      $(".pbutton").html(GetNamesAndTask() + " Stop");
      if (kidNames.length > 0) {
        $('.sbutton').prop('disabled', false);
        Session.set("isStart", true)
      } else {
        $('.sbutton').prop('disabled', true);
        Session.set("isStart", true)
      }
    },
    "click .kname": function(e) {
      var kname = e.target.name;
      console.log("kname:" + e.target.name);
      Meteor.call("togglePlayer", kname);
      $(".sbutton").html(GetNamesAndTask() + " Start");
      $(".pbutton").html(GetNamesAndTask() + " Stop");
      if (kidNames.length > 0 && tname != "")
        $('.sbutton').prop('disabled', false);
      else
        $('.sbutton').prop('disabled', true);
      Session.set("isStart", true)
    },
    "click .sbutton": function(e) {
      console.log("Adding new start time.")

      var d = new Date();
      Meteor.call("insertTime", kidNames, tname, "start", d.toUTCString(), d.getTime());
      $('.pbutton').prop('disabled', false);
      $('.rbutton').prop('disabled', false);
      $('.sbutton').prop('disabled', true);
      Session.set("isStart", false)
    },
    "click .pbutton": function(e) {
      console.log("Adding new stop time.")

      var d = new Date();
      Meteor.call("insertTime", kidNames, tname, "stop", d.toUTCString(), d.getTime());
      $('.pbutton').prop('disabled', true);
      $('.rbutton').prop('disabled', true);
      $('.sbutton').prop('disabled', false);
      Session.set("isStart", true)
    },
    "click .rbutton": function(e) {
      console.log("Reset.")

      $('.pbutton').prop('disabled', true);
      $('.rbutton').prop('disabled', true);
      $('.sbutton').prop('disabled', false);
      Session.set("isStart", true)
    }
  });
  Template.times_page.events({
    "click .dbutton": function(e) {
      dname = e.target.name;
      console.log("dname:" + dname);
      Meteor.call("removeTime", dname);
    }
  });
  Template.chart.events({
    "click .update": function(e) {
      var kidsNames = [];
      var cursor = Kids.find();
      cursor.forEach(function(doc) {
        console.log(doc.name);
        kidsNames.push(doc.name);
      });

      var ctx = $("#chart").get(0).getContext("2d");
      var ds = [];
      var count = 0;
      var totalTests = Tests.find().count();
      cursor = Tests.find();
      cursor.forEach(function(doc) {
        var o = new Object;
        o.label = doc.name;
        o.data = new Array();
        o.fillColor = "rgba(151,187,205,0.2)";
        var r = 1.0 - count * .1;
        var red = ((count + 1) % totalTests) * 100
        var green = ((count + 2) % totalTests) * 100
        var blue = ((count + 3) % totalTests) * 100
        var g = 50 * count;
        console.log("click pushing new skill to chart of " + doc.name + " with count of " + count);
        o.strokeColor = "rgba(" + red + "," + green + "," + blue + "," + r + ")";
        $("#l" + count).css("color", o.strokeColor);
        for (var i = 0; i < kidsNames.length; i++) {
          var t = Refined.find({
            name: kidsNames[i],
            skill: doc.name
          }, {
            sort: {
              time: 1
            }
          }).fetch()[0];

          if (t)
            o.data.push(t.time);
          else
            o.data.push(99);
        }
        ds.push(o);
        count++;
      });

      var data = {
        labels: kidsNames,
        datasets: ds,
      }
      var hockeyChart = new Chart(ctx).Line(data);


    }
  });

  Template.dump.onRendered(function() {
    var cursor = Times.find();
    var row = $("#out");
    var ms = -1;

    cursor.forEach(function(doc) {
      console.log(doc.name + doc.skill + doc.sevent + doc.time + doc.ms + doc.isGroup);
      var groupStr = " "
      if (doc.isGroup)
        groupStr = " and group "

      if (ms == doc.ms)
        console.log("Skip the rest of the group")
      else
        row.append("<p class='entry'>" + doc.name + groupStr + ',' + doc.skill + ', ' + doc.sevent + ',' + doc.time + "</p> </br>");
      ms = doc.ms;
    });
  });
  Template.dump.helpers({
    times: function() {
      return Times.find();
    }
  });

  Template.chart.onRendered(function() {
    setTimeout(function() {
      var kidsNames = [];
      var cursor = Kids.find();
      cursor.forEach(function(doc) {
        console.log(doc.name);
        kidsNames.push(doc.name);
      });

      var ctx = $("#chart").get(0).getContext("2d");
      var ds = [];
      var count = 0;
      var totalTests = Tests.find().count();
      totalTests = totalTests ? totalTests : 4;
      cursor = Tests.find();
      cursor.forEach(function(doc) {
        var o = new Object;
        o.label = doc.name;
        o.data = new Array();
        o.fillColor = "rgba(151,187,205,0.2)";
        var r = 1.0 - count * .1;
        var red = ((count + 1) % totalTests) * 50
        var green = ((count + 2) % totalTests) * 50
        var blue = ((count + 3) % totalTests) * 50
        var g = 50 * count;
        console.log("click pushing new skill to chart of " + doc.name + " with count of " + count);
        o.strokeColor = "rgba(" + red + "," + green + "," + blue + "," + r + ")";
        $("#l" + count).css("color", o.strokeColor);
        for (var i = 0; i < kidsNames.length; i++) {
          var t = Refined.find({
            name: kidsNames[i],
            skill: doc.name
          }, {
            sort: {
              time: 1
            }
          }).fetch()[0];

          if (t)
            o.data.push(t.time);
          else
            o.data.push(-1);
        }
        ds.push(o);
        count++;
      });

      var data = {
        labels: kidsNames,
        datasets: ds,
      }
      var hockeyChart = new Chart(ctx).Line(data);
      //      document.getElementById('js-legend').innerHTML = hockeyChart.generateLegend();
    }, 1000);
  });

  Template.chart.helpers({
    legend: function() {},
    tests: function() {
      return Tests.find();
    },
    times: function() {
      return Times.find();
    }
  });

  Template.available_user_list.helpers({

    users: function() {

      return Meteor.users.find();
    }
  })
  Template.available_user.helpers({
    getUsername: function(userId) {
      user = Meteor.users.findOne({
        _id: userId
      });
      return user.profile.username;
    },
    isMyUser: function(userId) {
      if (userId == Meteor.userId()) {
        return true;
      } else {
        return false;
      }
    }
  })


  Template.chat_page.helpers({
    messages: function() {

      var chat = Chats.findOne({
        _id: Session.get("chatId")
      });
      if (chat) {
        return chat.messages;
      }

    },
    other_user: function() {

      var chat = Chats.findOne({
        _id: Session.get("chatId")
      });
      if (chat)
        return chat.user2Id;
    },
  });

  Template.chat_page.events({

    "click #laugh": function(e) {
      $("#m").val($("#m").val() + " :-D ");
    },


    "click #cheeky": function(e) {
      $("#m").val($("#m").val() + " :-P ");
    },


    "click #happy": function(e) {
      console.log("happy added to existing message" + $("#m").val());
      $("#m").val($("#m").val() + " :-)) ");
    },

    "click #smiley": function(e) {
      console.log("smiley added to existing message" + $("#m").val());
      $("#m").val($("#m").val() + " :-) ");
    },


    "click #sad": function(e) {
      $("#m").val($("#m").val() + " :-( ");
    },


    "click #shocked": function(e) {
      $("#m").val($("#m").val() + " :-O ");
    },


    "click #winky": function(e) {
      $("#m").val($("#m").val() + " ;-) ");
    },


    // this event fires when the user sends a message on the chat page
    'submit .js-send-chat': function(event) {

      // stop the form from triggering a page reload
      event.preventDefault();
      if (!Meteor.userId()) {
        //not logged in, do not insert a chat
        console.log("Error: not logged in.")
        return false;
      }
      user = Meteor.users.findOne({
        _id: Meteor.userId()
      });
      Meteor.call("insertChatData",
        event.target.chat.value,
        user.profile.avatar,
        user.profile.username,
        Session.get("chatId"));
      // reset the form
      event.target.chat.value = "";
    }
  });
}






// start up script that creates some users for testing
// users have the username 'user1@test.com' .. 'user8@test.com'
// and the password test123

if (Meteor.isServer) {

  Meteor.publish('users', function() {
      return Meteor.users.find();
    }),

    Meteor.publish('times', function() {
      return Times.find();
    }),

    Meteor.publish('refined', function() {
      return Refined.find();
    }),

    Meteor.publish('kids', function() {
      return Kids.find();
    }),

    Meteor.publish('tests', function() {
      return Tests.find();
    }),


    // Only publish chats that belong to the current user
    Meteor.publish("chats", function() {
      return Chats.find({
        $or: [{
          user1Id: this.userId
        }, {
          user2Id: this.userId
        }]
      });
    }),

    Meteor.startup(function() {
      //uncomment to clear db
      //Kids.remove({})
      //Tests.remove({})
      //Times.remove({});
      //Refined.remove({});
      if (!Kids.findOne()) {
        Kids.insert({
          name: "Mia"
        });
        Kids.insert({
          name: "Justin"
        });
        Kids.insert({
          name: "Ryan"
        });
      }
      if (!Tests.findOne()) {
        Tests.insert({
          name: "Skating Forward"
        });
        Tests.insert({
          name: "Skating Backward"
        });
      }

      // for testing
      if (!Times.findOne()) {}
      if (!Meteor.users.findOne()) {
        console.log("creating additional users");
        Meteor.users.insert({
          profile: {
            username: "Orr",
            avatar: "bart.png"
          },
          emails: [{
            address: "i@test.com"
          }],
          services: {
            password: {
              "bcrypt": "$2a$10$I3erQ084OiyILTv8ybtQ4ON6wusgPbMZ6.P33zzSDei.BbDL.Q4EO"
            }
          }
        });

        Meteor.users.insert({
          profile: {
            username: "Gretzky",
            avatar: "lisa.png"
          },
          emails: [{
            address: "lisa@test.com"
          }],
          services: {
            password: {
              "bcrypt": "$2a$10$I3erQ084OiyILTv8ybtQ4ON6wusgPbMZ6.P33zzSDei.BbDL.Q4EO"
            }
          }
        });

        Meteor.users.insert({
          profile: {
            username: "Mia-2016",
            avatar: "homer.png"
          },
          emails: [{
            address: "user1@test.com"
          }],
          services: {
            password: {
              "bcrypt": "$2a$10$I3erQ084OiyILTv8ybtQ4ON6wusgPbMZ6.P33zzSDei.BbDL.Q4EO"
            }
          }
        });
        Meteor.users.insert({
          profile: {
            username: "Mia-2015",
            avatar: "dave.png"
          },
          emails: [{
            address: "mia@test.com"
          }],
          services: {
            password: {
              "bcrypt": "$2a$10$I3erQ084OiyILTv8ybtQ4ON6wusgPbMZ6.P33zzSDei.BbDL.Q4EO"
            }
          }
        });

        for (var i = 2; i < 9; i++) {
          var email = "user" + i + "@test.com";
          var username = "Instructor" + i;
          var avatar = "ava" + i + ".png"
          console.log("creating a user with password 'test123' and username/ email: " + email);
          Meteor.users.insert({
            profile: {
              username: username,
              avatar: avatar
            },
            emails: [{
              address: email
            }],
            services: {
              password: {
                "bcrypt": "$2a$10$I3erQ084OiyILTv8ybtQ4ON6wusgPbMZ6.P33zzSDei.BbDL.Q4EO"
              }
            }
          });
        }
      }
    });
}

//All these methods are for security, feel free to ignore the rest of the file
Meteor.methods({
  insertChatData: function(text, avatar, sent_by, chatId) {
    // see if we can find a chat object in the database
    // to which we'll add the message
    var chat = Chats.findOne({
      _id: chatId
    });
    if (chat) { // ok - we have a chat to use
      if (this.userId == chat.user1Id || this.userId == chat.user2Id) {
        var msgs = chat.messages; // pull the messages property
        if (!msgs) { // no messages yet, create a new array
          msgs = [];
        }
        msgs.push({
          text: text,
          avatar: avatar,
          sent_by: sent_by
        });
        // reset the form
        // put the messages array onto the chat object
        chat.messages = msgs;
        // update the chat object in the database.
        Chats.update(chat._id, chat);
      } else {
        console.log("Security alert: Wrong user is logged in.")
      }
    }
  },
  removeTime: function(ms) {
    Times.remove({
      ms: parseInt(ms)
    });
    console.log("Server Removing: " + ms);
  },
  insertTime: function(names, test, sevent, date, ms) {
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      Times.insert({
        name: name,
        skill: test,
        sevent: sevent,
        time: date,
        ms: ms,
        isGroup: (names.length > 1)
      });
      if (sevent === "stop") {
        var stime = Times.findOne({
          name: name,
          skill: test,
          sevent: "start"
        }, {
          sort: {
            time: -1,
            limit: 1
          }
        });

        console.log("calculating time against a starttime of: " + stime.time);
        var oldDate = new Date(stime.time);
        var finishDate = new Date(date);
        var numSecs = (finishDate.getTime() - oldDate.getTime()) * 1.0 / 1000.0;
        Refined.insert({
          name: name,
          skill: test,
          time: numSecs
        });
      }
    }
  },
  insertTest: function(name) {
    if (!Tests.findOne({
        name: name
      }))
      Tests.insert({
        name: name
      });
  },
  togglePlayer: function(name) {
    var doc = Kids.findOne({
      name: name
    });
    var selected = !doc.selected

    Kids.update({
      name: name
    }, {
      $set: {
        selected: selected
      }
    });
  },
  insertPlayer: function(name) {
    Kids.insert({
      name: name,
      selected: false
    });
  },
  insertChat: function(user1, user2) {
    if (!user1 || !user2) {
      console.log("Error: cannot chat with someone that does not exist!");
    } else
      Chats.insert({
        user1Id: user1,
        user2Id: user2
      });
  }
});
