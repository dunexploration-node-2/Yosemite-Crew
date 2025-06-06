import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { BoxDiv, DivHeading, ListSelect, TopHeading } from "../Dashboard/page";
import "./Appointment.css";
import UplodeImage from "../../Components/UplodeImage/UplodeImage";
import AssesmentResponse from "../../Components/AssesmentResponse/AssesmentResponse";
// import whtmsg from '../../../../public/Images/whtmsg.png';
// import pet1 from '../../../../public/Images/pet1.png';
// import whtcheck from '../../../../public/Images/whtcheck.png';
// import report1 from '../../../../public/Images/report1.png';
// import report2 from '../../../../public/Images/report2.png';
// import box2 from '../../../../public/Images/box2.png';
// import box4 from '../../../../public/Images/box4.png';
// import box5 from '../../../../public/Images/box5.png';
// import box6 from '../../../../public/Images/box6.png';
// import btn1 from '../../../../public/Images/btn1.png';
// import btn2 from '../../../../public/Images/btn2.png';
// import btn3 from '../../../../public/Images/btn3.png';
// import btn4 from '../../../../public/Images/btn4.png';
import ChatApp from "../../Components/ChatApp/ChatApp";
import ActionsTable from "../../Components/ActionsTable/ActionsTable";
// import Accpt from '../../../../public/Images/acpt.png';
// import Decln from '../../../../public/Images/decline.png';
import DocterWiseAppoint from "../../Components/DocterWiseAppoint/DocterWiseAppoint";
import axios from "axios";
import Swal from "sweetalert2";
import { useAuth } from "../../context/useAuth";
import { Link, useNavigate } from "react-router-dom";
import {
  CanceledAndAcceptFHIRConverter,
  FHIRParser,
  FHIRToNormalConverter,
  NormalAppointmentConverter,
} from "../../utils/FhirMapper";
import { getData } from "../../services/apiService";


import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';

import { Image } from "react-bootstrap";
// import { Button } from 'react-bootstrap';

const Appointment = () => {
  const { userId, userType, onLogout } = useAuth();
  const navigate = useNavigate();

  const locales = {
      'en-US': enUS,
    };

  // dropdown
  const optionsList1 = [
    "Last 7 Days",
    "Last 10 Days",
    "Last 20 Days",
    "Last 21 Days",
  ];
  const [allAppointments, setAllAppointments] = useState([]);
  const [total, setTotal] = useState();

  const getAllAppointments = useCallback(
    async (offset, itemsPerPage, userId) => {
      try {
        const response = await getData(
          `fhir/v1/Appointment?organization=Hospital/${userId}&offset=${offset}&limit=${itemsPerPage}&type=${"AppointmentLists"}`
        );
        if (response.status === 200 && response.data.status === 1) {
          const normalAppointments =
            NormalAppointmentConverter.convertAppointments({
              totalAppointments: response.data.data.total,
              appointments: response.data.data.entry.map(
                (entry) => entry.resource
              ),
            });
          setAllAppointments(normalAppointments.appointments);
          setTotal(normalAppointments.totalAppointments);
        } else if (response.status === 200 && response.data.status === 0) {
          // new Swal({
          //   title: "Not Found",
          //   text: response.data?.message || "Requested data not found.",
          //   icon: "error",
          // });
          console.log("error");
        }
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log("Session expired. Redirecting to signin...");
          onLogout(navigate);
        }
      }
    },
    [navigate, onLogout]
  );
  const AppointmentActions = async (id, status, offset) => {
    try {
      const token = sessionStorage.getItem("token");

      // Prepare FHIR-compliant payload
      const fhirAppointment = CanceledAndAcceptFHIRConverter.toFHIR({
        id,
        status,
      });

      const response = await axios.put(
        `${import.meta.env.VITE_BASE_URL}fhir/v1/Appointment/${id}?userId=${userId}`,
        fhirAppointment,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 200) {
        Swal.fire({
          title: "Appointment Status Changed",
          text: "Appointment Status Changed Successfully",
          icon: "success",
        });
      }

      getAllAppointments(offset, 6);
      // getlast7daysAppointMentsCount();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        onLogout(navigate);
      }

      Swal.fire({
        title: "Error",
        text: "Failed to Change Appointment Status",
        icon: "error",
      });
    }
  };
  const [AppointmentStatusAndCounts, setAppointmentStatusAndCounts] = useState(
    {}
  );

  const getAppUpcCompCanTotalCounts = useCallback(
    async (selectedOption) => {
      const days = parseInt(selectedOption.match(/\d+/)[0], 10);

      try {
        const response = await getData(
          `fhir/v1/MeasureReport?userId=${userId}&LastDays=${days}&type=AppointmentManagement`
        );
        if (response.status === 200) {
          const data = new FHIRParser(
            response.data.data
          ).overviewConvertToNormal();

          setAppointmentStatusAndCounts(data);
        }
      } catch (error) {
        if (error.response && error.response.status === 401) {
          onLogout(navigate);
        } else if (
          error.response &&
          [400, 500].includes(error.response.status)
        ) {
          const errorMessage =
            error.response?.data?.issue?.[0]?.details?.text ||
            "An unexpected error occurred.";
          Swal.fire({
            title: "Error",
            text: errorMessage,
            icon: "error",
          });
        }
      }
    },
    [userId, navigate, onLogout]
  );

  useEffect(() => {
    if (userId) getAllAppointments(0, 6, userId);
    getAppUpcCompCanTotalCounts("Last 7 Days");
  }, [userId, getAppUpcCompCanTotalCounts, getAllAppointments]);

  const [confirmedAppointments, setConfirmedAppointments] = useState([]);
  const [calenderAppointments, setCalenderAppointments] = useState([]);
  const [calendarView, setCalendarView] = useState(1);
  const [confirmedPage, setConfirmedPage] = useState(1);
  const [confirmedLoading, setConfirmedLoading] = useState(false);
  const [confirmedHasMore, setConfirmedHasMore] = useState(true);
  const [totalConfirmedAppointments, setTotalConfirmedAppointments] =
    useState(0);
  const confirmedObserverRef = useRef(null);

  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingHasMore, setUpcomingHasMore] = useState(true);
  const [totalUpcomingAppointments, setTotalUpcomingAppointments] = useState(0);
  const upcomingObserverRef = useRef(null);

  const [canceledAppointments, setCanceledAppointments] = useState([]);
  const [canceledPage, setCanceledPage] = useState(1);
  const [canceledLoading, setCanceledLoading] = useState(false);
  const [canceledHasMore, setCanceledHasMore] = useState(true);
  const [totalCanceledAppointments, setTotalCanceledAppointments] = useState(0);
  const canceledObserverRef = useRef(null);

  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedHasMore, setCompletedHasMore] = useState(true);
  const [totalCompletedAppointments, setTotalCompletedAppointments] =
    useState(0);
  const completedObserverRef = useRef(null);
  const limit = 8;

  const fetchAppointments = useCallback(
    async (type, page, setData, setLoading, setHasMore, setTotal) => {
      if (setLoading) setLoading(true);

      try {
        const token = sessionStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}fhir/v1/Appointment?type=${type}`,
          {
            params: { userId, page, limit },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.status === 200) {
          const data = new FHIRToNormalConverter(response.data).toNormal();
          setData((prev) => {
            const newAppointments = data.appointments.filter(
              (appt) => !prev.some((p) => p._id === appt._id)
            );
            return [...prev, ...newAppointments];
          });

          setTotal(data.totalCount);
          setHasMore(data.appointments.length === limit);
        }
      } catch (error) {
        if (error.response && error.response.status === 401) {
          onLogout(navigate);
        }
        Swal.fire({
          title: "Error",
          text: `Failed to fetch ${type.toLowerCase()} appointments`,
          icon: "error",
        });
      } finally {
        if (setLoading) setLoading(false);
      }
    },
    [userId, navigate, onLogout]
  ); // Removed unnecessary dependencies



   const fetchCalenderAppointments = async (userId) => {
        try {
          await getData(`fhir/v1/Appointment?organization=Hospital/${userId}&type=${"calenderaAppointment"}`)
          .then(res => {
            if (res.status === 200) {
              const normaldata = new FHIRToNormalConverter(res.data).toNormal();
              setCalenderAppointments(normaldata.appointments);
            }
          });
        } catch (err) {
            Swal.fire({
                  title: "Error",
                  text: err,
                  icon: "error",
                });
        }
      };

  useEffect(() => {
    if (userId) {
      fetchAppointments(
        "Confirmed",
        confirmedPage,
        setConfirmedAppointments,
        setConfirmedLoading,
        setConfirmedHasMore,
        setTotalConfirmedAppointments
      );
    }
  }, [userId, confirmedPage, fetchAppointments]);

  useEffect(() => {
    if (userId) {
      fetchAppointments(
        "UpComing",
        upcomingPage,
        setUpcomingAppointments,
        setUpcomingLoading,
        setUpcomingHasMore,
        setTotalUpcomingAppointments
      );
    }
  }, [userId, upcomingPage, fetchAppointments]);

  useEffect(() => {
    if (userId) {
      fetchAppointments(
        "Cancelled",
        canceledPage,
        setCanceledAppointments,
        setCanceledLoading,
        setCanceledHasMore,
        setTotalCanceledAppointments
      );
    }
  }, [userId, canceledPage, fetchAppointments]);

  useEffect(() => {
    if (userId) {
      fetchAppointments(
        "Completed",
        completedPage,
        setCompletedAppointments,
        setCompletedLoading,
        setCompletedHasMore,
        setTotalCompletedAppointments
      );
    }
  }, [userId, completedPage, fetchAppointments]);


  useEffect(() => {
    if (userId) {
      fetchCalenderAppointments(userId);
    }
  }, [userId, calendarView]);

  const createObserver = useCallback(
    (setPage, hasMore, observerRef) => (node) => {
      if (!node || !hasMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setPage((prev) => prev + 1);
          }
        },
        { threshold: 1.0 }
      );

      observerRef.current.observe(node);
    },
    []
  );

  const lastConfirmedAppointmentRef = useCallback(
    (node) =>
      createObserver(
        setConfirmedPage,
        confirmedHasMore,
        confirmedObserverRef
      )(node),
    [setConfirmedPage, confirmedHasMore, createObserver]
  );

  const lastUpcomingAppointmentRef = useCallback(
    (node) =>
      createObserver(
        setUpcomingPage,
        upcomingHasMore,
        upcomingObserverRef
      )(node),
    [setUpcomingPage, upcomingHasMore, createObserver]
  );

  const lastCanceledAppointmentRef = useCallback(
    (node) =>
      createObserver(
        setCanceledPage,
        canceledHasMore,
        canceledObserverRef
      )(node),
    [setCanceledPage, canceledHasMore, createObserver]
  );

  const lastCompletedAppointmentRef = useCallback(
    (node) =>
      createObserver(
        setCompletedPage,
        completedHasMore,
        completedObserverRef
      )(node),
    [setCompletedPage, completedHasMore, createObserver]
  );

  return (
    <section className="AppintmentSection">
      <div className="container">
        <div className="MainDash">
        <div className="AssMantTop">
          <TopHeading
            heding="Appointment Management"
            notif="3 New Appointments"
          />
          <button type="button" data-bs-toggle="modal" data-bs-target="#DashModall" onClick={() => setCalendarView(1)}>
                          <Image src={`${import.meta.env.VITE_BASE_IMAGE_URL}/topic.png`} alt="Topic" />Calendar View
                        </button>     
            </div>
          <div className="overviewDiv">
            <div className="OverviewTop">
              <h5>Overview</h5>
              <ListSelect
                options={optionsList1}
                onChange={getAppUpcCompCanTotalCounts}
              />
            </div>
            <div className="overviewitem">
              <BoxDiv
                boximg={`${import.meta.env.VITE_BASE_IMAGE_URL}/box4.png`}
                ovradcls=" fawndark"
                ovrtxt="New Appointments"
                boxcoltext="frowntext"
                overnumb={AppointmentStatusAndCounts.newAppointments}
              />
              <BoxDiv
                boximg={`${import.meta.env.VITE_BASE_IMAGE_URL}/box2.png`}
                ovradcls=" purple"
                ovrtxt="Upcoming"
                boxcoltext="purpletext"
                overnumb={AppointmentStatusAndCounts.upcomingAppointments}
              />
              <BoxDiv
                boximg={`${import.meta.env.VITE_BASE_IMAGE_URL}/box5.png`}
                ovradcls=" cambrageblue"
                ovrtxt="Completed"
                boxcoltext="greentext"
                overnumb={AppointmentStatusAndCounts.successful}
              />
              <BoxDiv
                boximg={`${import.meta.env.VITE_BASE_IMAGE_URL}/box6.png`}
                ovradcls="chillibg"
                ovrtxt="Cancelled"
                boxcoltext="ciltext"
                overnumb={AppointmentStatusAndCounts.canceled}
              />
            </div>
          </div>

          <div>
            <DivHeading
              TableHead="New Appointments"
              tablespan={`(${total ? total : 0})`}
            />
            <ActionsTable
              total={total}
              onClick={getAllAppointments}
              appointments={allAppointments}
              onClicked={AppointmentActions}
              actimg1={`${import.meta.env.VITE_BASE_IMAGE_URL}/acpt.png`}
              actimg2={`${import.meta.env.VITE_BASE_IMAGE_URL}/decline.png`}
            />
          </div>

          <div className="DashCardData">
            {/* Confirmed Appointments Section */}
            <div className="DashCardDiv">
              <CardHead
                Cdtxt="Confirmed"
                Cdnumb={totalConfirmedAppointments}
                CdNClas="fawn"
              />
              <div className="DashCardItem fawnbg">
                {confirmedAppointments.map((appointment, index) => (
                  <div
                    ref={
                      index === confirmedAppointments.length - 1
                        ? lastConfirmedAppointmentRef
                        : null
                    }
                    key={index}
                  >
                    <AppointCard
                      crdimg={`${import.meta.env.VITE_BASE_IMAGE_URL}/pet1.png`}
                      cdowner={appointment.ownerName}
                      crdtpe={appointment.petName}
                      btnimg={`${import.meta.env.VITE_BASE_IMAGE_URL}/btn1.png`}
                      btntext={`${appointment.appointmentDate} - ${appointment.appointmentTime}`}
                      crddoctor={appointment.veterinarian}
                      drjob={appointment.department}
                      CardbtnClass="btnfown"
                    />
                  </div>
                ))}
                {confirmedLoading && <p>Loading more appointments...</p>}
              </div>
            </div>

            {/* Upcoming Appointments Section */}
            <div className="DashCardDiv">
              <CardHead
                Cdtxt="Upcoming"
                Cdnumb={totalUpcomingAppointments}
                CdNClas="fawn"
              />
              <div className="DashCardItem fawnbg">
                {upcomingAppointments.map((appointment, index) => (
                  <div
                    ref={
                      index === upcomingAppointments.length - 1
                        ? lastUpcomingAppointmentRef
                        : null
                    }
                    key={index}
                  >
                    <AppointCard
                      crdimg={`${import.meta.env.VITE_BASE_IMAGE_URL}/pet1.png`}
                      cdowner={appointment.ownerName}
                      crdtpe={appointment.petName}
                      btnimg={`${import.meta.env.VITE_BASE_IMAGE_URL}/btn2.png`}
                      btntext={`${appointment.appointmentDate} - ${appointment.appointmentTime}`}
                      crddoctor={appointment.veterinarian}
                      drjob={appointment.department}
                      CardbtnClass="btnPurple"
                    />
                  </div>
                ))}
                {upcomingLoading && <p>Loading more appointments...</p>}
              </div>
            </div>

            <div className="DashCardDiv">
              <CardHead
                Cdtxt="Completed"
                Cdnumb={totalCompletedAppointments}
                CdNClas="fawn"
              />
              <div className="DashCardItem fawnbg">
                {completedAppointments.map((appointment, index) => (
                  <div
                    ref={
                      index === completedAppointments.length - 1
                        ? lastCompletedAppointmentRef
                        : null
                    }
                    key={index}
                  >
                    <AppointCard
                      crdimg={`${import.meta.env.VITE_BASE_IMAGE_URL}/pet1.png`}
                      cdowner={appointment.ownerName}
                      crdtpe={appointment.petName}
                      btnimg={`${import.meta.env.VITE_BASE_IMAGE_URL}/btn3.png`}
                      btntext="Completed"
                      // {`${appointment.appointmentDate} - ${appointment.appointmentTime}`}
                      crddoctor={appointment.veterinarian}
                      drjob={appointment.department}
                      CardbtnClass="btngreen"
                    />
                  </div>
                ))}
                {completedLoading && <p>Loading more appointments...</p>}
              </div>
            </div>

            <div className="DashCardDiv">
              <CardHead
                Cdtxt="Canceled"
                Cdnumb={totalCanceledAppointments}
                CdNClas="fawn"
              />
              <div className="DashCardItem fawnbg">
                {canceledAppointments.map((appointment, index) => (
                  <div
                    ref={
                      index === canceledAppointments.length - 1
                        ? lastCanceledAppointmentRef
                        : null
                    }
                    key={index}
                  >
                    <AppointCard
                      crdimg={`${import.meta.env.VITE_BASE_IMAGE_URL}/pet1.png`}
                      cdowner={appointment.ownerName}
                      crdtpe={appointment.petName}
                      btnimg={`${import.meta.env.VITE_BASE_IMAGE_URL}/btn4.png`}
                      btntext="Cancelled"
                      // {`${appointment.appointmentDate} - ${appointment.appointmentTime}`}
                      crddoctor={appointment.veterinarian}
                      drjob={appointment.department}
                      CardbtnClass="btnchilly"
                    />
                  </div>
                ))}
                {canceledLoading && <p>Loading more appointments...</p>}
              </div>
            </div>

            <DashModal />  
            <CalenderModal calenderAppointments = {calenderAppointments} locales={locales}/> 
          </div>

          <div className="dd">
            {userType === "Hospital" ? <DocterWiseAppoint /> : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Appointment;

TextSpan.propTypes = {
  Textname: PropTypes.string.isRequired,
  Textnspan: PropTypes.string.isRequired,
  showLast7Days: PropTypes.bool,
};
TextSpan.defaultProps = {
  showLast7Days: false, // Default to hidden
};

// Text Span
export function TextSpan({ Textname, Textnspan, showLast7Days }) {
  return (
    <div className="TextHeading">
      <h5>
        {Textname} {Textnspan && <span>{Textnspan}</span>}
      </h5>
      {showLast7Days && <p>Last 7 Days</p>}
    </div>
  );
}

export function DashModal() {
  return (
    <div className="DashCardModal">
      <div
        className="modal fade"
        id="DashModal"
        tabIndex="-1"
        aria-labelledby="DashModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="LeftContent">
              <div className="TopContent">
                <div className="lfttop">
                  <Image
                    src={`${import.meta.env.VITE_BASE_IMAGE_URL}/pet1.png`}
                    alt=""
                  />
                  <div className="owndt">
                    <h5>Appointment for Kizie</h5>
                    <p>
                      <i className="ri-user-fill"></i> Sky B
                    </p>
                  </div>
                </div>
                <div className="ryttop">
                  <Link to="#">
                    <i className="ri-star-fill"></i> New
                  </Link>
                </div>
              </div>

              <div className="MidContent">
                <h4>Appointment Details</h4>
                <div className="lfttop">
                  <Image
                    src={`${import.meta.env.VITE_BASE_IMAGE_URL}/pet1.png`}
                    alt=""
                  />
                  <div className="owndt">
                    <h6>Dr. Emily Johnson</h6>
                    <p>Cardiology</p>
                  </div>
                </div>

                <div className="cardbtn btnfown">
                  <button type="button">
                    <Image
                      src={`${import.meta.env.VITE_BASE_IMAGE_URL}/btn1.png`}
                      alt=""
                    />{" "}
                    Tuesday, 10 Sep - 11:00 AM
                  </button>
                </div>

                <div className="modlbtn">
                  <button type="button" className="confirm">
                    {" "}
                    <Image
                      src={`${import.meta.env.VITE_BASE_IMAGE_URL}/box5.png`}
                      alt=""
                    />{" "}
                    Confirm{" "}
                  </button>
                  <button type="button" className="cancel">
                    {" "}
                    <Image
                      src={`${import.meta.env.VITE_BASE_IMAGE_URL}/box6.png`}
                      alt=""
                    />{" "}
                    Cancel{" "}
                  </button>
                </div>
              </div>

              <div className="ModlMedclRept">
                <TextSpan Textname="Medical Reports " Textnspan="(2)" />
                <div className="MedReport">
                  <Image
                    src={`${import.meta.env.VITE_BASE_IMAGE_URL}/report1.png`}
                    alt=""
                  />
                  <Image
                    src={`${import.meta.env.VITE_BASE_IMAGE_URL}/report2.png`}
                    alt=""
                  />
                </div>
              </div>

              <AssesmentResponse />

              <div className="AssmtReportDiv">
                <TextSpan Textname="Assessment Report" />

                <div className="AssesmtSore">
                  <h6 className="emltext">Assessment Score</h6>
                  <div className="aa">
                    <ol className="score">
                      <div className="scrDiv">
                        <div className="scroli">
                          <li>
                            <input
                              type="radio"
                              name="recommend"
                              className="radio-button"
                              // arial-label="rate 1"
                              data-text="1"
                            />
                          </li>
                          <li>
                            <input
                              type="radio"
                              name="recommend"
                              className="radio-button"
                              // arial-label="rate 2"
                              data-text="2"
                            />
                          </li>
                        </div>
                        <h6>No pain</h6>
                      </div>

                      <div className="scrDiv">
                        <div className="scroli">
                          <li>
                            <input
                              type="radio"
                              name="recommend"
                              className="radio-button"
                              // arial-label="rate 3"
                              data-text="3"
                            />
                          </li>
                          <li>
                            <input
                              type="radio"
                              name="recommend"
                              className="radio-button"
                              // arial-label="rate 4"
                              data-text="4"
                            />
                          </li>
                        </div>
                        <h6>Low</h6>
                      </div>

                      <div className="scrDiv">
                        <div className="scroli">
                          <li>
                            <input
                              type="radio"
                              name="recommend"
                              className="radio-button"
                              // arial-label="rate 5"
                              data-text="5"
                            />
                          </li>
                          <li>
                            <input
                              type="radio"
                              name="recommend"
                              className="radio-button"
                              // arial-label="rate 6"
                              data-text="6"
                            />
                          </li>
                        </div>
                        <h6>Moderate</h6>
                      </div>

                      <div className="scrDiv">
                        <div className="scroli">
                          <li>
                            <input
                              type="radio"
                              name="recommend"
                              className="radio-button"
                              data-text="7"
                            />
                          </li>
                          <li>
                            <input
                              type="radio"
                              name="recommend"
                              className="radio-button"
                              data-text="8"
                            />
                          </li>
                        </div>
                        <h6>Significant</h6>
                      </div>

                      <div className="scrDiv">
                        <div className="scroli">
                          <li>
                            <input
                              type="radio"
                              name="recommend"
                              className="radio-button"
                              // arial-label="rate 9"
                              data-text="9"
                            />
                          </li>
                          <li>
                            <input
                              type="radio"
                              name="recommend"
                              className="radio-button"
                              // arial-label="rate 10"
                              data-text="10"
                            />
                          </li>
                        </div>
                        <h6>Intense</h6>
                      </div>
                    </ol>
                  </div>
                </div>

                <div className="">
                  <h6 className="emltext">Notes</h6>
                  <TextAreaDiv Arealabl="Add your assessment notes. This will be shared with the pet owner." />
                </div>
              </div>

              <div className="PresDiv">
                <TextSpan Textname="Prescription" />
                <TextAreaDiv Arealabl="Add details" />
              </div>

              <div className="Upld">
                <h5>OR Upload</h5>
                <UplodeImage />
              </div>

              <MainBtn
                bimg={`${import.meta.env.VITE_BASE_IMAGE_URL}/whtcheck.png`}
                btext="Mark as Complete"
                optclas="opt"
              />
            </div>

            <div className="RytContent">
              <div className="RytContDetails">
                <div className="ownerImg">
                  <Image
                    src={`${import.meta.env.VITE_BASE_IMAGE_URL}/pet1.png`}
                    alt=""
                  />
                  <div className="owndetl">
                    <h4>Kizie</h4>
                    <p>Beagle</p>
                  </div>
                </div>

                <div className="PopOwnerDetail">
                  <div className="popowneritems">
                    <h5>Gender</h5>
                    <h4>Female</h4>
                  </div>
                  <div className="popowneritems">
                    <h5>Age</h5>
                    <h4>3 Years</h4>
                  </div>
                  <div className="popowneritems">
                    <h5>Neutered</h5>
                    <h4>Yes</h4>
                  </div>
                  <div className="popowneritems">
                    <h5>Weight</h5>
                    <h4>28.66lbs</h4>
                  </div>
                </div>

                <MainBtn
                  bimg={`${import.meta.env.VITE_BASE_IMAGE_URL}/whtmsg.png`}
                  btext="Message Owner"
                  optclas=""
                />
              </div>

              <ChatApp />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// TextArea

TextAreaDiv.propTypes = {
  Arealabl: PropTypes.string,
};
export function TextAreaDiv({ Arealabl }) {
  return (
    <div className="form-floating">
      <textarea
        className="form-control"
        placeholder="Leave a comment here"
        id="floatingTextarea2"
      ></textarea>
      <label htmlFor="floatingTextarea2">{Arealabl}</label>
    </div>
  );
}

// Main Btn
export function MainBtn({
  bimg,
  btext,
  optclas,
  mdtarget,
  onClick,
  btntyp,
  disabled,
}) {
  return (
    <div className={`ModlMainbtn ${optclas}`}>
      <button
        type={btntyp}
        disabled={disabled}
        {...(mdtarget
          ? { "data-bs-toggle": "modal", "data-bs-target": mdtarget }
          : {})}
        onClick={onClick}
      >
        {bimg && <Image src={bimg} alt="button icon" />} {btext}
      </button>
    </div>
  );
}

MainBtn.propTypes = {
  bimg: PropTypes.string,
  btext: PropTypes.string,
  optclas: PropTypes.string,
  mdtarget: PropTypes.string,
  btntyp: PropTypes.string,
  onClick: PropTypes.func, // ✅ Fix here
  disabled: PropTypes.bool,
};

MainBtn.defaultProps = {
  optclas: "",
  disabled: false,
};
// AppointCard start
AppointCard.propTypes = {
  crdimg: PropTypes.string,
  cdowner: PropTypes.string,
  crdtpe: PropTypes.string,
  btntext: PropTypes.string,
  btnimg: PropTypes.string,
  crddoctor: PropTypes.string,
  crddodrjobctor: PropTypes.string,
  drjob: PropTypes.string,
  CardbtnClass: PropTypes.string,
};

export function AppointCard({
  crdimg,
  cdowner,
  crdtpe,
  btntext,
  btnimg,
  crddoctor,
  drjob,
  CardbtnClass,
}) {
  return (
    <div className="Confcard">
      <div className="cardTopInner">
        <Image src={crdimg} alt="cardimg" />
        <div className="Sideinner">
          <h6>{cdowner}</h6>
          <p>
            <i className="ri-user-fill"></i> {crdtpe}
          </p>
        </div>
      </div>
      <div className="midinner">
        <h4>{crddoctor}</h4>
        <p>{drjob}</p>
      </div>
      <div className={`cardbtn ${CardbtnClass}`}>
        <button
          type="button"
          data-bs-toggle="modal"
          data-bs-target="#DashModal"
        >
          <Image src={btnimg} alt="" /> {btntext}
        </button>
      </div>
    </div>
  );
}

// CardHead Text
CardHead.propTypes = {
  Cdtxt: PropTypes.string,
  Cdnumb: PropTypes.string,
  CdNClas: PropTypes.string,
};

export function CardHead({ Cdtxt, Cdnumb, CdNClas }) {
  return (
    <div className="DashcardText">
      <h6>{Cdtxt}</h6>
      <h6 className={CdNClas}>{Cdnumb}</h6>
    </div>
  );
}




CalenderModal.propTypes ={ 
  calenderAppointments : PropTypes.string,
    locales : PropTypes.string
}



// Modal Component
export function CalenderModal({
  calenderAppointments,
  locales
  
}) {


  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales
  });

  const appointments = [];

 
  if (Array.isArray(calenderAppointments)) {
    calenderAppointments.forEach((appointment) => {

     
      const colors = {'booked' : '#d09b5e', 'cancelled' : '#d04122', 'fulfilled' : '#8ac1b1' , 'pending' : '#8e88d2'} 
      const now = new Date();
      let date = new Date(appointment.appointmentDate); // e.g., "2025-05-02"
      let dateString = date.toISOString().split('T')[0]; // "2025-05-02"
      let timeString = appointment.appointmentTime; // e.g., "11:00 AM"

      let startDateTime = new Date(`${dateString} ${timeString}`);
      let endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);


      let color = colors[appointment.appointmentStatus];

      if (date > now && appointment.appointmentStatus ==='booked') {
         color = '#8e88d2';
      } 
     
      let apData = {
        title: `${appointment.ownerName} - ${appointment.petName} \nDr.  ${appointment.veterinarian}`,
        start: startDateTime,
        end: endDateTime,
        color: color
      };

      appointments.push(apData);
    });
  }


  return (
    <div className="AstManageCardModal">
      <div
        className="modal fade"
        id="DashModall"
        tabIndex="-1"
        aria-labelledby="DashModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="AssessmentCatalogueDiv">

              <h3></h3>

    
              <div className="AsstmntTableDiv">
              <div style={{ height: '80vh', padding: '20px' }}>
              <Calendar
                localizer={localizer}
                events={appointments}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                defaultView="month"
                views={['month', 'week', 'day']}
                style={{ height: '100%' }}
                eventPropGetter={(event) => ({
                  style: {
                    backgroundColor: event.color || '#3174ad',
                    color: 'white',
                    borderRadius: '5px',
                    border: 'none',
                    padding: '4px',
                    whiteSpace: 'normal' 
                  }
                })}
              />
            </div>
              </div>


              <div className="AstCatalgBtn">
              
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

