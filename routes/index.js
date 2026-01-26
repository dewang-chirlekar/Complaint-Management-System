const express = require('express');
const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

let User = require('../models/user');
let Complaint = require('../models/complaint');
let ComplaintMapping = require('../models/complaint-mapping');

// Home Page - Dashboard
router.get('/', ensureAuthenticated, (req, res, next) => {
    res.render('index');
});

// Login Form
router.get('/login', (req, res, next) => {
    res.render('login');
});

// Register Form
router.get('/register', (req, res, next) => {
    res.render('register');
});

// Logout
router.get('/logout', ensureAuthenticated,(req, res, next) => {
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/login');
});

// Admin
router.get('/admin', ensureAuthenticated, async (req, res) => {
    try {
        const complaints = await Complaint.find().populate('user');

        const groupedComplaints = {};

        complaints.forEach(c => {
            const dept = c.user?.department || 'Unknown';

            if (!groupedComplaints[dept]) {
                groupedComplaints[dept] = [];
            }
            groupedComplaints[dept].push(c);
        });

        const resolver = await User.getResolver();

        res.render('admin/admin', {
            groupedComplaints,
            resolver
        });

    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});



// Assign the Complaint to Resolver
router.post('/assign', (req,res,next) => {
    const complaintID = req.body.complaintID;
    const resolverName = req.body.resolverName;

    req.checkBody('complaintID', 'Contact field is required').notEmpty();
    req.checkBody('resolverName', 'Description field is required').notEmpty();

    let errors = req.validationErrors();

    if (errors) {
        res.render('admin/admin', {
            errors: errors
        });
    } else {
        const newComplaintMapping = new ComplaintMapping({
            complaintID: complaintID,
            resolverName: resolverName,
        });

        ComplaintMapping.registerMapping(newComplaintMapping, (err, complaint) => {
            if (err) throw err;
            req.flash('success_msg', 'You have successfully assigned a complaint to Resolver');
            res.redirect('/admin');
        });
    }

});

router.post('/assign', (req, res, next) => {
    // assign logic
});   // 👈 ends here (line ~76)


// ✅ ADD BELOW THIS LINE (around 77)

// Update Complaint Status (Admin & Resolver)
router.post('/updateStatus', ensureAuthenticated, (req, res) => {
    const { complaintID, status } = req.body;
    const role = req.user.role;

    if (role === 'admin') {
        Complaint.findByIdAndUpdate(complaintID, { status }, err => {
            if (err) throw err;
            res.redirect('back');
        });
    } 
    else if (
        role === 'resolver' &&
        (status === 'In Progress' || status === 'Resolved')
    ) {
        Complaint.findByIdAndUpdate(complaintID, { status }, err => {
            if (err) throw err;
            res.redirect('back');
        });
    } 
    else {
        req.flash('error_msg', 'Not authorized');
        res.redirect('back');
    }
});


// Resolver route
router.get('/resolver', ensureAuthenticated, (req, res) => {
    res.render('resolver/resolver');
});


// Junior Eng
router.get('/jeng', ensureAuthenticated, (req,res,next) => {
    res.render('junior/junior');
});

//Complaint
router.get('/complaint', ensureAuthenticated, (req, res, next) => {
    //console.log(req.session.passport.username);
    //console.log(user.name);
    res.render('complaint', {
        username: req.session.user,
    });
});

// Student - View My Complaints
router.get('/my-complaints', ensureAuthenticated, async (req, res) => {
    try {
        const complaints = await Complaint.find({ user: req.user._id });
        res.render('mycomplaints', {
            complaints: complaints
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// Register a Complaint
router.post('/registerComplaint', ensureAuthenticated, (req, res) => {
    const title = req.body.title;
    const description = req.body.description;

    req.checkBody('title', 'Title is required').notEmpty();
    req.checkBody('description', 'Description is required').notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        return res.render('complaint', { errors });
    }

    const newComplaint = new Complaint({
        title: title,
        description: description,
        status: 'Pending',
        user: req.user._id
    });

    newComplaint.save((err) => {
        if (err) {
            console.error(err);
            return res.redirect('/');
        }
        req.flash('success_msg', 'Complaint registered successfully');
        res.redirect('/');
    });
});


// Process Register
router.post('/register', (req, res, next) => {
    const name = req.body.name;
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const password2 = req.body.password2;
    const role = req.body.role;
    const department = req.body.department;

    req.checkBody('name', 'Name field is required').notEmpty();
    req.checkBody('email', 'Email field is required').notEmpty();
    req.checkBody('email', 'Email must be a valid email address').isEmail();
    req.checkBody('username', 'Username field is required').notEmpty();
    req.checkBody('password', 'Password field is required').notEmpty();
    req.checkBody('password2', 'Passwords do not match').equals(req.body.password);
    req.checkBody('role', 'Role option is required').notEmpty();
    req.checkBody('department', 'Department field is required').notEmpty();


    let errors = req.validationErrors();

    if (errors) {
        res.render('register', {
            errors: errors
        });
    } else {
        const newUser = new User({
            name: name,
            username: username,
            email: email,
            password: password,
            role: role,
            department: department
        });

        User.registerUser(newUser, (err, user) => {
    if (err) {
        req.flash('error_msg', 'Username already exists');
        return res.redirect('/register');
    }
    req.flash('success_msg', 'You are Successfully Registered and can Log in');
    res.redirect('/login');
});

    }
});

// Local Strategy
passport.use(new LocalStrategy((username, password, done) => {
    User.getUserByUsername(username, (err, user) => {
        if (err) throw err;
        if (!user) {
            return done(null, false, {
                message: 'No user found'
            });
        }

        User.comparePassword(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, {
                    message: 'Wrong Password'
                });
            }
        });
    });
}));

passport.serializeUser((user, done) => {
    var sessionUser = {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
    }
    done(null, sessionUser);
});

passport.deserializeUser((id, done) => {
    User.getUserById(id, (err, sessionUser) => {
        done(err, sessionUser);
    });
});

// Login Processing
router.post('/login', passport.authenticate('local', 
    { 
        failureRedirect: '/login', 
        failureFlash: true 
    
    }), (req, res, next) => {
    
        req.session.save((err) => {
        if (err) {
            return next(err);
        }
        if(req.user.role==='admin'){
            res.redirect('/admin');
        }
        else if(req.user.role==='jeng'){
            res.redirect('/jeng');
        }
        else{
            res.redirect('/');
        }
    });
});

// Access Control
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.flash('error_msg', 'You are not Authorized to view this page');
        res.redirect('/login');
    }
}

module.exports = router;