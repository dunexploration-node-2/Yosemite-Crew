import React, { useCallback, useEffect, useRef, useState } from "react";
import "./DepartmentsMain.css";
// import { TextSpan } from '../Appointment/page'
import { BoxDiv, ListSelect } from "../Dashboard/page";
// import box1 from '../../../../public/Images/box1.png';
// import box2 from '../../../../public/Images/box2.png';
// import box3 from '../../../../public/Images/box3.png';
// import box4 from '../../../../public/Images/box4.png';
import { AddSerchHead } from "../Add_Doctor/Add_Doctor";
import DepartmentAppointmentsChart from "../../Components/BarGraph/DepartmentAppointmentsChart";
import WeeklyAppointmentsChart from "../../Components/BarGraph/WeeklyAppointmentsChart";
import axios from "axios";
import Swal from "sweetalert2";
import { useAuth } from "../../context/useAuth";
import { useNavigate } from "react-router-dom";
import { FHIRParser } from "../../utils/FhirMapper";
import { DepartmentFHIRConverter } from "../../utils/DepartmentFHIRMapper";

const DepartmentsMain = () => {
  const [DepartmentsOverView, SetDepartmentsOverView] = useState({});
  const [graphData, setGraphData] = useState([]);
  const [WeeklyAppointmentGraph, setWeeklyAppointmentGraph] = useState([]);

  const { userId, onLogout } = useAuth();
  const navigate = useNavigate();

  const didFetch = useRef(false); // prevents multiple API calls

  const optionsList1 = [
    "Last 7 Days",
    "Last 10 Days",
    "Last 20 Days",
    "Last 21 Days",
  ];

  const GetDepartmentsOverView = useCallback(
    async (selectedOption) => {
      const days = parseInt(selectedOption.match(/\d+/)[0], 10);
      try {
        const token = sessionStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}fhir/v1/MeasureReport?userId=${userId}&type=DepartmentOverview`,
          {
            params: { LastDays: days },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = new FHIRParser(
          response.data.data
        ).overviewConvertToNormal();
        SetDepartmentsOverView(data);
      } catch (error) {
        if (error.response?.status === 401) {
          onLogout(navigate);
        }
        Swal.fire({
          title: "Error",
          text: "Failed to get departments overview",
          icon: "error",
        });
      }
    },
    [onLogout, userId, navigate]
  );

  const DepartmentBasisAppointmentGraph = useCallback(
    async (selectedOption) => {
      const days = parseInt(selectedOption.match(/\d+/)[0], 10);
      try {
        const token = sessionStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}fhir/v1/List?userId=${userId}&reportType=AppointmentGraphs`,
          {
            params: { LastDays: days },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = DepartmentFHIRConverter.fromFHIR(response.data);
        const formattedData = data.map((item) => ({
          name: item.departmentName,
          appointments: item.count,
        }));
        setGraphData(formattedData);
      } catch (error) {
        if (error.response?.status === 401) {
          onLogout(navigate);
        }
        Swal.fire({
          title: "Error",
          text: "Failed to get department basis appointment graph",
          icon: "error",
        });
      }
    },
    [onLogout, userId, navigate]
  );

  const getDataForWeeklyAppointmentChart = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}fhir/v1/List?userId=${userId}&reportType=WeeklyAppointmentGraph`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = new DepartmentFHIRConverter().convertFromFHIR(response.data);
      const formattedData = data.map((item) => ({
        name: item.day,
        appointments: item.count,
      }));
      setWeeklyAppointmentGraph(formattedData);
    } catch (error) {
      if (error.response?.status === 401) {
        onLogout(navigate);
      }
      Swal.fire({
        title: "Error",
        text: "Failed to get weekly appointment chart data",
        icon: "error",
      });
    }
  }, [onLogout, navigate, userId]);

  useEffect(() => {
    if (userId && !didFetch.current) {
      didFetch.current = true;
      getDataForWeeklyAppointmentChart();
      DepartmentBasisAppointmentGraph("Last 7 Days");
      GetDepartmentsOverView("Last 7 Days");
    }
  }, [
    userId,
    getDataForWeeklyAppointmentChart,
    DepartmentBasisAppointmentGraph,
    GetDepartmentsOverView,
  ]);
  return (
    <section className="Department_MainSec">
      <div className="container">
        <div className="MainDash">
          <AddSerchHead
            adtext="Departments"
            adbtntext="Add Department"
            adhrf="/add_department"
          />

          <div className="overviewDiv">
            <div className="OverviewTop">
              <h5>Overview</h5>
              <ListSelect
                options={optionsList1}
                onChange={GetDepartmentsOverView}
              />
            </div>
            <div className="overviewitem">
              <BoxDiv
                boximg={`${import.meta.env.VITE_BASE_IMAGE_URL}/box2.png`}
                ovradcls="purple"
                ovrtxt="Departments"
                boxcoltext="purpletext"
                overnumb={
                  DepartmentsOverView.totalDepartments
                    ? DepartmentsOverView.totalDepartments
                    : 0
                }
              />
              <BoxDiv
                boximg={`${import.meta.env.VITE_BASE_IMAGE_URL}/box4.png`}
                ovradcls=" fawndark"
                ovrtxt="Total Doctors "
                boxcoltext="frowntext"
                overnumb={
                  DepartmentsOverView.totalDoctors
                    ? DepartmentsOverView.totalDoctors
                    : 0
                }
              />
              <BoxDiv
                boximg={`${import.meta.env.VITE_BASE_IMAGE_URL}/box3.png`}
                ovradcls=" cambrageblue"
                ovrtxt="New Animal"
                boxcoltext="greentext"
                overnumb={
                  DepartmentsOverView.newPetsCount
                    ? DepartmentsOverView.newPetsCount
                    : 0
                }
              />
              <BoxDiv
                boximg={`${import.meta.env.VITE_BASE_IMAGE_URL}/box1.png`}
                ovradcls="chillibg"
                ovrtxt="Appointments Today"
                boxcoltext="ciltext"
                overnumb={
                  DepartmentsOverView.totalAppointments
                    ? DepartmentsOverView.totalAppointments
                    : 0
                }
              />
            </div>
          </div>

          <div className="DepartWeekGraph">
            <div className="DashGraphCard">
              <div className="GraphTop">
                <h5>Appointments</h5>
                <ListSelect
                  options={optionsList1}
                  onChange={DepartmentBasisAppointmentGraph}
                />
              </div>
              <div className="graphimg">
                <DepartmentAppointmentsChart data={graphData} />
              </div>
            </div>

            <div className="DashGraphCard">
              <WeeklyAppointmentsChart data={WeeklyAppointmentGraph} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DepartmentsMain;
