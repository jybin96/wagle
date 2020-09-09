const express = require("express");
const app = express();
const port = 3001;
const cors = require("cors");
const bodyparser = require("body-parser");
const mysql = require("mysql");
var http = require("http").createServer(app);
const io = require("socket.io")(http);

// nodemailer 모듈 요청
const nodemailer = require("nodemailer");
const { light } = require("@material-ui/core/styles/createPalette");
const { futimes } = require("fs");
//mysql연결
var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "wagle",
});

connection.connect();
//bodyparser및 cors 사용
app.use(bodyparser.urlencoded({ extended: false }));
app.use(cors());
app.use(bodyparser.json());

io.on("connection", function (socket) {
  // 소켓을 연결하는 부분
  //socket이랑 연결된 부분

  socket.on("room", (id) => {
    socket.join(id, () => {
      console.log(id + "접속함");
      // console.log(socket);
    });
  });
  //sql문에 매칭 추가
  socket.on("start", (_id, nick, sex) => {
    console.log("start : " + _id + " " + nick + " " + sex); //
    if (sex === "M") {
      connection.query(
        "INSERT INTO matching_table_m (matching_userid, matching_nickname) values(?,?)",
        [_id, nick],
        // "UPDATE user_info SET user_matching =? WHERE user_id =?",
        // "SELECT * FROM user_info WHERE user_id =(?)",
        function (err, rows, fields) {
          if (err) {
            console.log("남자테이블 입력 에러" + err);
          } else {
            socket.emit("apply");
            console.log("남자 매칭을 시작합니다");
          }
          //매칭 등록 emit 하는 부분
        }
      );
    } else if (sex === "F") {
      connection.query(
        "INSERT INTO matching_table_w (matching_userid, matching_nickname) values(?,?)",
        [_id, nick],
        // "UPDATE user_info SET user_matching =? WHERE user_id =?",
        // "SELECT * FROM user_info WHERE user_id =(?)",
        function (err, rows, fields) {
          if (err) {
            console.log("여자테이블 입력 에러" + err);
          } else {
            socket.emit("apply");
            console.log("여자 매칭을 시작합니다");
          }
          //매칭 등록 emit 하는 부분
        }
      );
    } else {
      console.log("테이블 입력 실패");
    }
  });

  socket.on("matching", (_id, sex) => {
    console.log("서버:매칭 시작" + _id + sex);

    if (sex === "M") {
      //사용자가 남자일때
      //1. 본인테이블 검색
      connection.query(
        "SELECT * FROM matching_table_m WHERE matching_userid = (?)",
        [_id],
        function (err, rows, fields) {
          if (rows === undefined) {
            socket.emit("apply");
          } else if (rows[0].matching_womanid === null) {
            // 내 테이블에 신청한 여자가 없을때
            connection.query("SELECT * FROM matching_table_w", function (
              err,
              rows,
              fields
            ) {
              if (err) {
                console.log("여자 테이블 검색 실패");
              } else if (rows[0] === undefined) {
                //여자테이블에 신청자가 없다
                socket.emit("apply");
              } else {
                const matchingw = rows[0].matching_userid;
                console.log(matchingw + "이년이랑 매칭 성공");
                //여자 테이블에 신청자가 있을때 남자테이블에 여자아이디, 여자테이븛에 남자 아아디 입력
                connection.query(
                  "UPDATE matching_table_w SET matching_manid = (?) WHERE matching_userid =(?)",
                  [_id, rows[0].matching_userid],
                  function (err, rows, field) {
                    connection.query(
                      "UPDATE matching_table_m SET matching_womanid = (?) WHERE matching_userid =(?)",
                      [matchingw, _id],
                      function (err, rows, field) {
                        console.log("1");
                        socket.emit("matching_success");
                      }
                    );
                  }
                );
              }
            });
          } else if (rows[0].matching_womanid != null) {
            console.log("남자쪽 매칭 성공");
            console.log("2");
            socket.emit("matching_success");
          }
        }
      );
    } else {
      //사용자가 여자일 때
      //1.본인 테이블 검색
      connection.query(
        "SELECT * FROM matching_table_w WHERE matching_userid = (?)",
        [_id],
        function (err, rows, fields) {
          if (rows === undefined) {
            socket.emit("apply");
          } else if (rows[0].matching_manid === null) {
            // 내 테이블에 신청한 남자가 없을때 남자 테이블 검색
            connection.query("SELECT * FROM matching_table_m", function (
              err,
              rows,
              fields
            ) {
              if (err) {
                console.log("남자 테이블 검색 실패");
              } else if (rows[0] === undefined) {
                //남자테이블에 신청자가 없다
                socket.emit("apply");
              } else {
                const matchingm = rows[0].matching_userid;
                //남자 테이블에 신청자가 있을때 남자테이블에 여자아이디, 여자테이블에 남자 아아디 입력
                connection.query(
                  "UPDATE matching_table_m SET matching_wonmanid = (?) WHERE matching_userid =(?)",
                  [_id, rows[0].matching_userid],
                  function (err, rows, fields) {
                    connection.query(
                      "UPDATE matching_table_w SET matching_manid = (?) WHERE matching_userid =(?)",
                      [matchingm, _id],
                      function (err, rows, field) {
                        console.log("a");
                        socket.emit("matching_success");
                      }
                    );
                  }
                );
              }
            });
          } else if (rows[0].matching_manid != null) {
            console.log("여자쪽 매칭 성공");
            console.log("b");
            socket.emit("matching_success");
          }
        }
      );
    }
  });

  socket.on("room_join", (_id, sex) => {
    if (sex === "M") {
      connection.query(
        "SELECT * FROM matching_table_m WHERE matching_userid =(?)",
        [_id],
        function (err, rows, fields) {
          if (err) {
            console.log("룸 만들다 err");
          } else {
            console.log("3");
            console.log(rows[0]);
            // console.log(rows[0].womanid);
            if (rows[0] === undefined) {
            } else {
              console.log("4");
              const room_name = rows[0].matching_userid.concat(
                rows[0].matching_womanid
              );
              const womanid = rows[0].matching_womanid;
              socket.join((room_name, womanid), () => {
                console.log(room_name + " 남자: 접속완료");
                connection.query(
                  "INSERT INTO wagle_room (room_userid, room_touserid, room_roomname) values (?,?,?)",
                  [_id, womanid, room_name],
                  function (err, rows, fields) {
                    console.log(_id + womanid + room_name);
                    if (err) {
                      console.log("err");
                    }
                    connection.query(
                      "DELETE FROM matching_table_m WHERE matching_userid =(?)",
                      [_id],
                      function (err, rows, field) {
                        console.log("5");
                      }
                    );
                  }
                );
              });
            }
          }
        }
      );
    } else {
      connection.query(
        "SELECT * FROM matching_table_w WHERE matching_userid =(?)",
        [_id],
        function (err, rows, fields) {
          if (err) {
            console.log("룸 만들다 err");
          } else {
            console.log("c");
            if (rows[0] === undefined) {
            } else {
              console.log("d");
              const room_name = rows[0].matching_manid.concat(
                rows[0].matching_userid
              );
              socket.join(room_name, () => {
                console.log(room_name + " 여자: 접속완료");
                connection.query(
                  "INSERT INTO wagle_room (room_userid, room_touserid, room_roomname) values (?,?,?)",
                  [_id, rows[0].matching_manid, room_name],
                  function (err, rows, fields) {
                    connection.query(
                      "DELETE FROM matching_table_w WHERE matching_userid =(?)",
                      [_id],
                      function (err, rows, fields) {
                        console.log("e");
                      }
                    );
                  }
                );
              });
            }
          }
        }
      );
    }
  });

  socket.on("room", (room_id) => {
    socket.join(room_id, () => {
      console.log(room_id + " 접속했음");
    });
  });

  socket.on("send message", (message) => {
    // socket은 개인의 고유값
    console.log(message);
    io.to(message.id).emit("show message", message.message); //io 전체
  });
});

app.post("/message_collect", (req, res) => {
  const userid = req.body.userid;
  connection.query(
    "select * from wagle_room where room_userid = ?",
    [userid],
    function (err, rows, field) {
      console.log("message_collect api log" + rows);
      res.send(rows);
    }
  );
});

//3001/Signup 포트로 보내기
app.post("/Signup", (req, res) => {
  //회원가입
  const _id = req.body._id;
  const mail = req.body.email;
  const pass = req.body.pass;
  const pass2 = req.body.pass2;
  const nickname = req.body.nick;
  const sex = req.body.sex;
  connection.query(
    "insert into user_info (user_id,user_password, user_nickname, user_email, user_sex) values (?,?,?,?,?)",
    [_id, pass, nickname, mail, sex],
    function (err, rows, fields) {
      if (err) {
        res.send(false);
      } else {
        res.send(true);
      }
    }
  );
});
//닉네임 중복검사 하는거
app.post("/CheckNick", (req, res) => {
  const checkingNick = req.body.check_Nick;
  connection.query(
    "SELECT user_nickname FROM user_info WHERE user_nickname =(?)",
    [checkingNick],
    function (err, rows, fields) {
      if (rows[0] === undefined) {
        res.send(true); //중복 없음 사용가능
      } else {
        res.send(false); // 중복 있음 사용안됨
      }
    }
  );
});
//ID 중복검사 하는거
app.post("/CheckId", (req, res) => {
  const checkingId = req.body.check_Id;
  connection.query(
    "SELECT user_id FROM user_info WHERE user_id =(?)",
    [checkingId],
    function (err, rows, fields) {
      console.log(rows[0]);
      console.log(checkingId);
      if (rows[0] === undefined) {
        res.send(true); //중복 없음 사용가능
      } else {
        res.send(false); // 중복 있음 사용안됨
      }
    }
  );
});
//로그인 하는 부분
app.post("/login", (req, res) => {
  const name = req.body.name;
  const pass = req.body.pass;
  const box = {};
  box.boolean = false;

  connection.query(
    "SELECT user_id FROM user_info WHERE user_id = (?)",
    [name],
    function (err, rows, fields) {
      console.log(rows[0]);
      if (rows[0] === undefined) {
        res.send(box);
      } else {
        connection.query(
          "SELECT user_id, user_password ,user_email,user_nickname, user_sex FROM user_info WHERE  user_id = (?) AND user_password =(?)",
          [name, pass],
          function (err, rows, fields) {
            if (rows[0] === undefined) {
              res.send(box);
            } else {
              box.user_id = rows[0].user_id;
              box.user_email = rows[0].user_email;
              box.user_nickname = rows[0].user_nickname;
              box.user_sex = rows[0].user_sex;
              box.boolean = true;
              res.send(box);
            }
          }
        );
      }
      //console.log(rows);
    }
  );
});

app.post("/Sendmail", (req, res) => {
  const email = req.body.sendEmail;
  var authNum = Math.floor(Math.random() * 1000000) + 100000;
  if (authNum > 1000000) {
    authNum = authNum - 100000;
  }

  let emailParam = {
    toEmail: email + "@gmail.com", //gmail.com -> changwon.ac.kr로 수정하기
    subject: "회원가입 인증 메일입니다.",
    text: "인증번호는 " + authNum + "입니다.",
  };
  connection.query(
    "SELECT user_email FROM user_info WHERE user_email = (?)",
    [email],
    function (err, rows, fields) {
      if (rows[0] === undefined) {
        //중복된 메일 없음 메일 발송
        mailSender.sendGmail(emailParam);
        res.send(authNum.toString());
      } else {
        //중복된 메일이 있음
        res.send(true);
      }
    }
  );
});

//닉네임 업데이트하기
app.post("/Update_nick", (req, res) => {
  const nick = req.body.nick;
  const preNick = req.body.preNick;
  connection.query(
    "SELECT user_nickname FROM user_info WHERE user_nickname = (?)",
    [nick],
    function (err, rows, fields) {
      //중복된 닉네임이 없음 닉네임 변경 진행
      if (rows[0] === undefined && !err) {
        connection.query(
          "UPDATE user_info SET user_nickname =(?) WHERE user_nickname =(?)",
          [nick, preNick]
        );
        console.log("true");
        res.send(true);
      } else {
        console.log("중복된 닉네임");
        res.send(false);
      }
    }
  );
});

app.post("/Update_password", (req, res) => {
  const pass = req.body.pass;
  const user_id = req.body._id;
  console.log(pass);
  console.log(user_id);
  connection.query(
    "UPDATE user_info SET user_password =(?) WHERE user_id =(?)",
    [pass, user_id],
    function (err, rows, fields) {
      if (err) {
        console.log(err);
        console.log("변경실패");
      } else {
        console.log("변경성공");
      }
    }
  );
});

http.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

var mailSender = {
  // 메일발송 함수
  sendGmail: function (param) {
    var transporter = nodemailer.createTransport({
      service: "gmail",
      prot: 587,
      host: "smtp.gmail.com",
      secure: false,
      requireTLS: true,
      auth: {
        user: "gjdnjsdud10@gmail.com",
        pass: "ekdms!98",
      },
    });
    // 메일 옵션
    var mailOptions = {
      from: "gjdnjsdud10@gmail.com",
      to: param.toEmail, // 수신할 이메일
      subject: param.subject, // 메일 제목
      text: param.text, // 메일 내용
    };
    // 메일 발송
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  },
};