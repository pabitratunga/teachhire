import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, ChevronDown, Briefcase, Building2, GraduationCap, Users, FileText, Star, Bell, LogOut, Plus, Filter, Eye, Download, MessageSquare, Calendar, CheckCircle2, XCircle, AlertCircle, ArrowRight, ArrowLeft, X, User, Shield, BarChart3, Upload, Trash2, Edit, ExternalLink, Award, Bookmark, TrendingUp, Layers, Zap, Info, Send, RefreshCw, Database, Link, Clock3, Tag } from "lucide-react";
import {
  dbSignIn, dbSignUp, dbSignOut, dbGetCurrentUser,
  dbFetchJobs, dbInsertJob, dbUpdateJob,
  dbFetchApplications, dbInsertApplication, dbUpdateApplication,
  dbFetchScrapedJobs, dbUpsertScrapedJobs, dbUpdateScrapedJobStatus,
  dbFetchCustomSources, dbInsertCustomSource, dbDeleteCustomSource,
  dbUpdateCustomSource, dbUpdateCustomSourceFetch,
} from "./lib/db";

// ============================================================
// INITIAL CATEGORIES (converted to state in App)
// ============================================================
const INITIAL_CATEGORIES = [
  { id: "engineering", name: "ENGINEERING", icon: "⚙️", subjects: ["Civil Engineering","Mechanical Engineering","Electrical Engineering","Electronics & Communication","Computer Science","AI / Data Science","Information Technology"] },
  { id: "arts-science", name: "ARTS & SCIENCE", icon: "📚", subjects: ["Mathematics","Statistics","Physics","Chemistry","Computer Science","English","Bengali","Hindi","History","Geography","Political Science","Economics","Commerce","Sociology","Philosophy"] },
  { id: "medical", name: "MEDICAL", icon: "🏥", subjects: ["Anatomy","Physiology","Biochemistry","Pharmacology","Pathology","Microbiology","Community Medicine","Nursing","Allied Health Sciences"] },
  { id: "law", name: "LAW", icon: "⚖️", subjects: ["Constitutional Law","Criminal Law","Civil Law","Corporate Law","Family Law","Jurisprudence","Human Rights Law","International Law"] },
  { id: "school", name: "SCHOOL", icon: "🏫", subjects: ["Primary Teacher","TGT Mathematics","TGT Science","TGT English","TGT Social Science","PGT Mathematics","PGT Physics","PGT Chemistry","PGT Biology","PGT English","PGT Computer Science","Librarian","Physical Education","Special Educator","Headmaster / Principal"] },
  { id: "research", name: "RESEARCH", icon: "🔬", subjects: ["JRF","SRF","Project Associate","Research Assistant","Postdoctoral Fellow","Research Scientist","PhD Position"] },
];

const STATES_LIST = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
const CITIES = { "West Bengal":["Kolkata","Howrah","Durgapur","Siliguri","Asansol"],"Maharashtra":["Mumbai","Pune","Nagpur","Nashik"],"Delhi":["New Delhi","Noida","Gurgaon","Faridabad"],"Karnataka":["Bangalore","Mysore","Mangalore"],"Tamil Nadu":["Chennai","Coimbatore","Madurai","Salem"],"Bihar":["Patna","Gaya","Muzaffarpur","Bhagalpur"],"Uttar Pradesh":["Lucknow","Varanasi","Agra","Kanpur","Prayagraj"],"Kerala":["Thiruvananthapuram","Kochi","Kozhikode"],"Gujarat":["Ahmedabad","Surat","Vadodara"],"Telangana":["Hyderabad","Warangal"],"Rajasthan":["Jaipur","Jodhpur","Udaipur"],"Andhra Pradesh":["Visakhapatnam","Vijayawada","Tirupati"],"Punjab":["Chandigarh","Ludhiana","Amritsar"],"Jharkhand":["Ranchi","Jamshedpur"],"Odisha":["Bhubaneswar","Cuttack"],"Madhya Pradesh":["Bhopal","Indore"],"Haryana":["Chandigarh","Gurugram","Faridabad"],"Chhattisgarh":["Raipur"],"Assam":["Guwahati"],"Goa":["Panaji","Margao"],"Uttarakhand":["Dehradun","Haridwar"] };
const INSTITUTION_CATEGORIES = ["School","College","University","Medical College","Law College","Coaching Institute","EdTech","Research Institute"];
const OWNERSHIP_TYPES = ["Government","Private","Government Aided","Autonomous"];
const ACADEMIC_LEVELS = ["Primary","Upper Primary","Secondary","Higher Secondary","Diploma","UG","PG","PhD / Research"];
const EMPLOYMENT_TYPES = ["Full-time","Part-time","Contract","Guest Faculty","Visiting Faculty","Online Tutor","Temporary","Permanent"];
const WORK_MODES = ["Onsite","Online","Hybrid"];
const QUALIFICATIONS = ["B.Ed","M.Ed","B.A","M.A","B.Sc","M.Sc","B.Tech","M.Tech","MBBS","MD","LLB","LLM","Ph.D","NET/SET Qualified","D.El.Ed"];
const ROUND_TYPES = ["Screening","Subject Interview","Demo Class","HR Round","Principal / Management Round"];
const INTERVIEW_MODES = ["Online","Offline","Phone"];
const SOURCE_SITES = [
  { id:"ugc", name:"UGC / NTA", icon:"🏛️" },
  { id:"kvs", name:"KVS", icon:"🏫" },
  { id:"nvs", name:"NVS", icon:"📘" },
  { id:"sarkari", name:"Sarkari Result", icon:"📋" },
  { id:"nta", name:"NTA", icon:"📝" },
  { id:"custom", name:"Custom URL", icon:"🔗" },
];

const STATUS_COLORS = {
  "Applied":"bg-blue-100 text-blue-800","Under Review":"bg-yellow-100 text-yellow-800","Shortlisted":"bg-emerald-100 text-emerald-800","Rejected":"bg-red-100 text-red-700","On Hold":"bg-orange-100 text-orange-800","Interview Scheduled":"bg-indigo-100 text-indigo-800","Interview In Progress":"bg-purple-100 text-purple-800","Selected":"bg-green-100 text-green-800",
  "Published":"bg-green-100 text-green-800","Draft":"bg-gray-100 text-gray-600","Archived":"bg-gray-200 text-gray-600","Expired":"bg-red-50 text-red-600","Pending Approval":"bg-amber-100 text-amber-800","Pending":"bg-yellow-100 text-yellow-800",
  "pending_review":"bg-blue-100 text-blue-800","published":"bg-green-100 text-green-800","rejected":"bg-red-100 text-red-700",
  "pass":"bg-green-100 text-green-800","fail":"bg-red-100 text-red-700","scheduled":"bg-blue-100 text-blue-800","completed":"bg-green-100 text-green-800",
};

const TODAY = "2026-03-02";
const isExpired = d => d && (new Date(TODAY) - new Date(d)) / 86400000 > 30;
const shouldAutoArchive = j => j.status === "Published" && isExpired(j.deadline);
const isJobVisible = j => j.status === "Published" && !isExpired(j.deadline);

// ============================================================
// SEED DATA
// ============================================================
const SEED_JOBS = [
  { id:1, title:"Assistant Professor - Computer Science", categories:["engineering"], subjects:["Computer Science","AI / Data Science"], institution:"IIT Kharagpur", institutionCategory:"University", ownership:"Government", academicLevel:"PG", employmentType:"Full-time", states:["West Bengal"], cities:["Kolkata"], workMode:"Onsite", minQualification:"Ph.D", salaryMin:80000, salaryMax:150000, deadline:"2026-04-15", vacancies:3, description:"Looking for passionate educators in Computer Science with strong research background.", demoClass:true, writtenTest:false, rounds:3, status:"Published", postedDate:"2026-02-15", recruiterId:2, verified:true, applicants:47, featured:true, postedBy:"recruiter" },
  { id:2, title:"PGT Mathematics", categories:["school"], subjects:["PGT Mathematics"], institution:"Delhi Public School", institutionCategory:"School", ownership:"Private", academicLevel:"Higher Secondary", employmentType:"Full-time", states:["Delhi"], cities:["New Delhi"], workMode:"Onsite", minQualification:"M.Sc", salaryMin:45000, salaryMax:75000, deadline:"2026-03-30", vacancies:2, description:"DPS seeking experienced PGT Mathematics teacher.", demoClass:true, writtenTest:true, rounds:2, status:"Published", postedDate:"2026-02-20", recruiterId:2, verified:true, applicants:89, featured:true, postedBy:"recruiter" },
  { id:3, title:"Professor - Anatomy", categories:["medical"], subjects:["Anatomy"], institution:"AIIMS Delhi", institutionCategory:"Medical College", ownership:"Government", academicLevel:"PG", employmentType:"Full-time", states:["Delhi"], cities:["New Delhi"], workMode:"Onsite", minQualification:"MD", salaryMin:200000, salaryMax:300000, deadline:"2026-04-30", vacancies:1, description:"AIIMS invites applications for Professor in Anatomy.", demoClass:false, writtenTest:false, rounds:3, status:"Published", postedDate:"2026-02-18", recruiterId:2, verified:true, applicants:12, featured:false, postedBy:"recruiter" },
  { id:4, title:"Postdoctoral Fellow - AI Research", categories:["research","engineering"], subjects:["Postdoctoral Fellow","AI / Data Science"], institution:"IISc Bangalore", institutionCategory:"Research Institute", ownership:"Government", academicLevel:"PhD / Research", employmentType:"Contract", states:["Karnataka"], cities:["Bangalore"], workMode:"Hybrid", minQualification:"Ph.D", salaryMin:70000, salaryMax:90000, deadline:"2026-05-01", vacancies:5, description:"Join IISc's cutting-edge AI research lab.", demoClass:false, writtenTest:false, rounds:2, status:"Published", postedDate:"2026-02-25", recruiterId:2, verified:true, applicants:34, featured:true, postedBy:"recruiter" },
  { id:5, title:"Guest Faculty - English Literature", categories:["arts-science"], subjects:["English"], institution:"Presidency University", institutionCategory:"University", ownership:"Government", academicLevel:"PG", employmentType:"Guest Faculty", states:["West Bengal"], cities:["Kolkata"], workMode:"Onsite", minQualification:"M.A", salaryMin:25000, salaryMax:40000, deadline:"2026-03-20", vacancies:2, description:"Presidency University invites Guest Faculty in English.", demoClass:true, writtenTest:false, rounds:1, status:"Published", postedDate:"2026-02-28", recruiterId:2, verified:true, applicants:67, featured:false, postedBy:"recruiter" },
  { id:6, title:"Primary Teacher - KV Patna", categories:["school"], subjects:["Primary Teacher"], institution:"Kendriya Vidyalaya", institutionCategory:"School", ownership:"Government", academicLevel:"Primary", employmentType:"Full-time", states:["Bihar"], cities:["Patna"], workMode:"Onsite", minQualification:"D.El.Ed", salaryMin:30000, salaryMax:50000, deadline:"2026-04-05", vacancies:10, description:"KV Patna invites applications for Primary Teachers.", demoClass:true, writtenTest:true, rounds:3, status:"Published", postedDate:"2026-02-26", recruiterId:2, verified:true, applicants:234, featured:true, postedBy:"admin" },
  { id:7, title:"Lecturer Economics - Pending", categories:["arts-science"], subjects:["Economics"], institution:"ABC College Patna", institutionCategory:"College", ownership:"Private", academicLevel:"UG", employmentType:"Full-time", states:["Bihar"], cities:["Patna"], workMode:"Onsite", minQualification:"M.A", salaryMin:25000, salaryMax:40000, deadline:"2026-04-15", vacancies:2, description:"Looking for Economics lecturer.", demoClass:true, writtenTest:false, rounds:1, status:"Pending Approval", postedDate:"2026-03-01", recruiterId:4, verified:false, applicants:0, featured:false, postedBy:"recruiter" },
];
const SEED_APPLICATIONS = [
  { id:1, jobId:1, candidateId:1, status:"Interview In Progress", appliedDate:"2026-02-20", notes:[], rounds:[
    { id:1, name:"Screening", number:1, interviewer:"Dr. Sharma", role:"HOD", date:"2026-03-05", startTime:"10:00", endTime:"10:30", mode:"Online", instructions:"Brief intro", status:"completed", result:"pass", feedback:"Strong background", rating:4 },
    { id:2, name:"Subject Interview", number:2, interviewer:"Prof. Mukherjee", role:"Senior Faculty", date:"2026-03-12", startTime:"14:00", endTime:"15:00", mode:"Offline", instructions:"Prepare Algorithms", status:"scheduled", result:null, feedback:"", rating:null },
  ]},
  { id:2, jobId:2, candidateId:1, status:"Applied", appliedDate:"2026-02-25", notes:[], rounds:[] },
];
const SEED_USERS = [
  { id:1, email:"candidate@demo.com", password:"demo123", role:"candidate", name:"Priya Sharma", phone:"+91 98765 43210" },
  { id:2, email:"recruiter@demo.com", password:"demo123", role:"recruiter", name:"Rajesh Kumar", phone:"+91 87654 32109", institution:{ name:"IIT Kharagpur", category:"University", ownership:"Government", state:"West Bengal", city:"Kolkata", verified:true } },
  { id:3, email:"admin@demo.com", password:"admin123", role:"admin", name:"System Admin", phone:null },
  { id:4, email:"hr@abccollege.com", password:"demo123", role:"recruiter", name:"Sunita Devi", phone:"+91 76543 21098", institution:{ name:"ABC College Patna", category:"College", ownership:"Private", state:"Bihar", city:"Patna", verified:false } },
];
const SEED_ADMIN_REQUESTS = [
  { id:1, type:"verification", recruiterId:4, institution:"ABC College Patna", status:"Pending", date:"2026-02-28", message:"Please verify our institution." },
  { id:2, type:"job_approval", recruiterId:4, jobId:7, institution:"ABC College Patna", status:"Pending", date:"2026-03-01", message:"New job posting requires approval." },
];
const SEED_SCRAPED_JOBS = [
  { id:101, title:"Professor / Associate Professor - Various Departments", institution:"IIT Bombay", subjects:["Computer Science","Electrical Engineering"], states:["Maharashtra"], cities:["Mumbai"], ownership:"Government", deadline:"2026-04-30", description:"IIT Bombay invites applications for faculty positions.", source_url:"https://www.iitb.ac.in/jobs", source_site:"ugc", scraped_at:"2026-03-01 08:30", status:"pending_review", categories:["engineering"], academicLevel:"PG", employmentType:"Full-time", salaryMin:100000, salaryMax:220000 },
  { id:102, title:"Primary Teacher (PRT) - 500 Vacancies", institution:"Kendriya Vidyalaya Sangathan (KVS)", subjects:["Primary Teacher"], states:["Delhi","West Bengal"], cities:["New Delhi","Kolkata"], ownership:"Government", deadline:"2026-04-15", description:"KVS invites applications for PRT posts.", source_url:"https://kvsangathan.nic.in/recruitment", source_site:"kvs", scraped_at:"2026-03-01 09:00", status:"pending_review", categories:["school"], academicLevel:"Primary", employmentType:"Full-time", salaryMin:35000, salaryMax:55000 },
  { id:103, title:"JRF - Biotechnology", institution:"CSIR-IICB Kolkata", subjects:["JRF"], states:["West Bengal"], cities:["Kolkata"], ownership:"Government", deadline:"2026-04-05", description:"CSIR-IICB invites applications for JRF in Biotechnology.", source_url:"https://www.iicb.res.in/recruitment", source_site:"sarkari", scraped_at:"2026-03-02 09:00", status:"pending_review", categories:["research"], academicLevel:"PhD / Research", employmentType:"Contract", salaryMin:31000, salaryMax:35000 },
];
const SEED_SCRAPER_CONFIGS = [
  { id:1, site:"ugc", name:"UGC / NTA Jobs", url:"https://ugcnetonline.in/notifications.php", active:true, lastRun:"2026-03-02 09:00", jobsFound:12, frequency:"daily" },
  { id:2, site:"kvs", name:"KVS Recruitment", url:"https://kvsangathan.nic.in/recruitment", active:true, lastRun:"2026-03-02 09:05", jobsFound:3, frequency:"daily" },
  { id:3, site:"nvs", name:"NVS Recruitment", url:"https://navodaya.gov.in/nvs/recruitment", active:false, lastRun:"2026-03-01 09:00", jobsFound:5, frequency:"daily" },
];

// ============================================================
// SUBJECT REQUEST LOG (for HR suggestions)
// ============================================================
const SEED_SUBJECT_REQUESTS = [
  { id:1, subject:"Robotics Engineering", categoryId:"engineering", categoryName:"ENGINEERING", requestedBy:"Rajesh Kumar", institution:"IIT Kharagpur", date:"2026-03-01", status:"pending", note:"We need this for our new robotics lab hiring." },
];

// ============================================================
// UI COMPONENTS
// ============================================================
const Badge = ({ children, className="" }) => {
  const color = STATUS_COLORS[children] || "bg-gray-100 text-gray-700";
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color} ${className}`}>{children}</span>;
};
const Button = ({ children, variant="primary", size="md", className="", ...props }) => {
  const base = "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = { primary:"bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-500 shadow-sm", secondary:"bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400", danger:"bg-red-600 text-white hover:bg-red-700 focus:ring-red-500", success:"bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500", ghost:"text-slate-600 hover:bg-slate-100 focus:ring-slate-400", accent:"bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400 shadow-sm", warn:"bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400" };
  const sizes = { sm:"px-3 py-1.5 text-xs", md:"px-4 py-2 text-sm", lg:"px-6 py-3 text-base" };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
};
const Input = ({ label, className="", ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
    <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none transition-all bg-white" {...props}/>
  </div>
);
const Select = ({ label, options=[], placeholder="Select...", className="", ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none transition-all bg-white appearance-none" {...props}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
    </select>
  </div>
);
const Textarea = ({ label, className="", ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
    <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none transition-all bg-white resize-y" rows={4} {...props}/>
  </div>
);
const Card = ({ children, className="", onClick, hover=false }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${hover?"hover:shadow-md hover:border-slate-300 cursor-pointer transition-all duration-200":""} ${className}`} onClick={onClick}>{children}</div>
);
const Modal = ({ open, onClose, title, children, size="md" }) => {
  if (!open) return null;
  const sizes = { sm:"max-w-md", md:"max-w-2xl", lg:"max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20}/></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
const StatCard = ({ icon:Icon, label, value, color="slate" }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between">
      <div><p className="text-sm text-slate-500 mb-1">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div>
      <div className={`p-3 rounded-xl bg-${color}-100`}><Icon size={22} className={`text-${color}-600`}/></div>
    </div>
  </Card>
);
const EmptyState = ({ icon:Icon, title, description, action }) => (
  <div className="text-center py-16 px-4">
    <div className="inline-flex p-4 rounded-2xl bg-slate-100 mb-4"><Icon size={32} className="text-slate-400"/></div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 mb-6 max-w-md mx-auto">{description}</p>
    {action}
  </div>
);
const Tabs = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
    {tabs.map(t => (
      <button key={t.id} onClick={()=>onChange(t.id)} className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${active===t.id?"border-slate-800 text-slate-900":"border-transparent text-slate-500 hover:text-slate-700"}`}>
        {t.label}{t.count!=null&&<span className="ml-1.5 text-xs bg-slate-100 px-1.5 py-0.5 rounded-full">{t.count}</span>}
      </button>
    ))}
  </div>
);

const PhoneInput = ({ label, value, onChange, className = "" }) => {
  const [error, setError] = useState("");
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    if (digits.length > 0 && digits.length < 10) setError("Phone number must be 10 digits");
    else setError("");
    onChange(digits);
  };
  const display = value ? value.replace(/(\d{5})(\d{0,5})/, "$1 $2").trim() : "";
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <div className="relative flex items-center">
        <span className="absolute left-3 text-sm font-medium text-slate-500 select-none">+91</span>
        <input
          type="tel" inputMode="numeric" maxLength={11}
          placeholder="XXXXX XXXXX"
          value={display}
          onChange={handleChange}
          className={`w-full pl-12 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none transition-all bg-white ${error ? "border-red-400" : "border-slate-300"}`}
        />
        {value?.length === 10 && (
          <CheckCircle2 size={16} className="absolute right-3 text-emerald-500"/>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

const MultiSelect = ({ label, options=[], value=[], onChange, allowCustom=false, placeholder="Select...", className="" }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()) && !value.includes(o));
  const canAdd = allowCustom && search.trim() && !options.includes(search.trim()) && !value.includes(search.trim());
  const add = item => { onChange([...value, item]); setSearch(""); };
  const remove = item => onChange(value.filter(v => v !== item));
  return (
    <div className={className} ref={ref}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <div className="relative">
        <div className="min-h-[42px] w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white cursor-text flex flex-wrap gap-1 items-center" onClick={()=>setOpen(true)}>
          {value.map(v=><span key={v} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">{v}<button onClick={e=>{e.stopPropagation();remove(v);}} className="hover:text-red-500"><X size={12}/></button></span>)}
          <input type="text" placeholder={value.length===0?placeholder:"Add more..."} value={search} onChange={e=>{setSearch(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onKeyDown={e=>{if(e.key==="Enter"&&canAdd){e.preventDefault();add(search.trim());}if(e.key==="Backspace"&&!search&&value.length>0)remove(value[value.length-1]);}} className="flex-1 min-w-[80px] text-sm outline-none bg-transparent py-1"/>
        </div>
        {open&&(filtered.length>0||canAdd)&&(
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 max-h-48 overflow-y-auto">
            {canAdd&&<button onClick={()=>add(search.trim())} className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 text-amber-700 flex items-center gap-2 border-b border-slate-100"><Plus size={14}/>Add "{search.trim()}"</button>}
            {filtered.slice(0,20).map(o=><button key={o} onClick={()=>add(o)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-700">{o}</button>)}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// ADD SUBJECT MODAL
// ============================================================
const AddSubjectModal = ({ open, onClose, categories, onAdd, onRequest, role }) => {
  const [selectedCat, setSelectedCat] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const isAdmin = role === "admin";
  const cat = categories.find(c => c.id === selectedCat);
  const alreadyExists = cat && cat.subjects.some(s => s.toLowerCase() === newSubject.trim().toLowerCase());

  const reset = () => { setSelectedCat(""); setNewSubject(""); setNote(""); setDone(false); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!selectedCat || !newSubject.trim() || alreadyExists) return;
    if (isAdmin) {
      onAdd(selectedCat, newSubject.trim());
    } else {
      onRequest(selectedCat, newSubject.trim(), note.trim());
    }
    setDone(true);
  };

  return (
    <Modal open={open} onClose={handleClose} title={isAdmin ? "Add New Subject" : "Request New Subject"} size="sm">
      {done ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} className="text-green-600"/></div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">{isAdmin ? "Subject Added!" : "Request Sent!"}</h3>
          <p className="text-sm text-slate-500 mb-6">{isAdmin ? `"${newSubject}" has been added to ${cat?.name} and is now available everywhere.` : `Your request for "${newSubject}" has been sent to admin for approval.`}</p>
          <Button onClick={handleClose}>Close</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {!isAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5"/>
              <span>Your request will be reviewed by admin before the subject is added to the platform.</span>
            </div>
          )}
          <Select
            label="Category *"
            options={categories.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            placeholder="Select category..."
          />
          {selectedCat && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Subject Name *</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 outline-none bg-white"
                placeholder="e.g. Robotics Engineering"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
              />
              {alreadyExists && <p className="text-xs text-red-500 mt-1">This subject already exists in {cat?.name}.</p>}
              {cat && !alreadyExists && newSubject && (
                <p className="text-xs text-slate-500 mt-1">Will be added under: <span className="font-semibold">{cat.icon} {cat.name}</span></p>
              )}
            </div>
          )}
          {!isAdmin && selectedCat && (
            <Textarea label="Why is this subject needed? (optional)" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. We are hiring for our new robotics lab..."/>
          )}
          {selectedCat && newSubject && !alreadyExists && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              <p className="font-medium mb-1">Preview — Will appear in:</p>
              <ul className="space-y-0.5 text-xs text-slate-500">
                <li>✓ Mega menu under {cat?.name}</li>
                <li>✓ Job posting subject selector</li>
                <li>✓ Job listing filters</li>
                <li>✓ Candidate search</li>
              </ul>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={!selectedCat||!newSubject.trim()||alreadyExists} variant={isAdmin?"primary":"warn"}>
              {isAdmin ? <><Plus size={15} className="mr-1.5"/>Add Subject</> : <><Send size={15} className="mr-1.5"/>Send Request</>}
            </Button>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ============================================================
// MEGA MENU
// ============================================================
const MegaMenu = ({ categories, onSelectSubject, onSelectCategory }) => {
  const [active, setActive] = useState(null);
  const timeoutRef = useRef(null);
  const enter = id => { clearTimeout(timeoutRef.current); setActive(id); };
  const leave = () => { timeoutRef.current = setTimeout(()=>setActive(null), 150); };
  return (
    <div className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center flex-wrap">
          {categories.map(cat => (
            <div key={cat.id} className="relative" onMouseEnter={()=>enter(cat.id)} onMouseLeave={leave}>
              <button onClick={()=>{onSelectCategory(cat.id);setActive(null);}} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all ${active===cat.id?"bg-slate-700 text-amber-400":"text-slate-300 hover:text-white hover:bg-slate-700/50"}`}>
                <span>{cat.icon}</span><span>{cat.name}</span><ChevronDown size={14} className={`transition-transform duration-200 ${active===cat.id?"rotate-180":""}`}/>
              </button>
              {active===cat.id&&(
                <div onMouseEnter={()=>enter(cat.id)} onMouseLeave={leave} className="absolute top-full left-0 z-[999] bg-white shadow-2xl border border-slate-200 rounded-b-xl" style={{minWidth:240}}>
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{cat.name}</p></div>
                  <button onClick={()=>{onSelectCategory(cat.id);setActive(null);}} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 flex items-center gap-2 border-b border-slate-100"><Layers size={14}/>All {cat.name} Jobs</button>
                  {cat.subjects.map(sub=>(
                    <button key={sub} onClick={()=>{onSelectSubject(cat.id,sub);setActive(null);}} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center justify-between group">
                      <span>{sub}</span><ArrowRight size={13} className="opacity-0 group-hover:opacity-100 text-amber-400 transition-opacity"/>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// HEADER
// ============================================================
const Header = ({ user, onNavigate, onLogout, currentPage, onSearch }) => {
  const [kw, setKw] = useState("");
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 h-16">
          <button onClick={()=>onNavigate("home")} className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center"><GraduationCap size={20} className="text-amber-400"/></div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">Teach<span className="text-amber-500">Hire</span></span>
          </button>
          <div className="flex items-center gap-2 flex-1">
            <button onClick={()=>onNavigate("jobs")} className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${currentPage==="jobs"?"bg-slate-100 text-slate-900":"text-slate-600 hover:text-slate-900"}`}>Browse Jobs</button>
            <div className="flex items-center gap-2 flex-1 max-w-sm bg-slate-100 rounded-lg px-3 py-1.5">
              <Search size={15} className="text-slate-400 shrink-0"/>
              <input type="text" placeholder="Search subject, title..." className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder-slate-400" value={kw} onChange={e=>setKw(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){onSearch(kw);setKw("");}}}/>
              {kw&&<button onClick={()=>{onSearch(kw);setKw("");}} className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded font-medium">Go</button>}
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 shrink-0">
            {user?.role==="candidate"&&<button onClick={()=>onNavigate("candidate-dashboard")} className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage?.startsWith("candidate")?"bg-slate-100 text-slate-900":"text-slate-600 hover:text-slate-900"}`}>Dashboard</button>}
            {user?.role==="recruiter"&&<button onClick={()=>onNavigate("recruiter-dashboard")} className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage?.startsWith("recruiter")?"bg-slate-100 text-slate-900":"text-slate-600 hover:text-slate-900"}`}>Recruiter Panel</button>}
            {user?.role==="admin"&&<button onClick={()=>onNavigate("admin-dashboard")} className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage?.startsWith("admin")?"bg-slate-100 text-slate-900":"text-slate-600 hover:text-slate-900"}`}>Admin Panel</button>}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            {user?(
              <>
                <button className="relative p-2 hover:bg-slate-100 rounded-lg"><Bell size={18} className="text-slate-600"/><span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"/></button>
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold">{user.name?.charAt(0)}</div>
                  <div className="hidden lg:block"><p className="text-sm font-medium text-slate-900 leading-tight">{user.name}</p><p className="text-xs text-slate-500 capitalize">{user.role}</p></div>
                </div>
                <button onClick={onLogout} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><LogOut size={16}/></button>
              </>
            ):(
              <>
                <Button variant="ghost" size="sm" onClick={()=>onNavigate("login")}>Sign In</Button>
                <Button variant="primary" size="sm" onClick={()=>onNavigate("register")}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const Footer = () => (
  <footer className="bg-slate-900 text-slate-400 mt-auto">
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div><div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center"><GraduationCap size={18} className="text-amber-400"/></div><span className="text-white font-bold">TeachHire</span></div><p className="text-sm">India's premier platform for academic positions.</p></div>
        <div><h4 className="text-white font-semibold mb-3 text-sm">For Candidates</h4><div className="space-y-2 text-sm"><p className="hover:text-white cursor-pointer">Browse Jobs</p><p className="hover:text-white cursor-pointer">Create Profile</p></div></div>
        <div><h4 className="text-white font-semibold mb-3 text-sm">For Institutions</h4><div className="space-y-2 text-sm"><p className="hover:text-white cursor-pointer">Post a Vacancy</p><p className="hover:text-white cursor-pointer">ATS Features</p></div></div>
        <div><h4 className="text-white font-semibold mb-3 text-sm">Support</h4><div className="space-y-2 text-sm"><p className="hover:text-white cursor-pointer">About Us</p><p className="hover:text-white cursor-pointer">Contact</p><p className="hover:text-white cursor-pointer">Privacy Policy</p></div></div>
      </div>
      <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm"><p>© 2026 TeachHire. All rights reserved.</p></div>
    </div>
  </footer>
);

// ============================================================
// JOB CARD
// ============================================================
const JobCard = ({ job, onClick, categories, compact=false }) => {
  const expired = isExpired(job.deadline);
  return (
    <Card hover className={`${compact?"p-4":"p-5"} group ${expired?"opacity-60":""}`} onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg shrink-0">{categories.find(c=>job.categories?.includes(c.id))?.icon||"📋"}</div>
          <div><h3 className={`font-semibold text-slate-900 group-hover:text-amber-600 transition-colors ${compact?"text-sm":"text-base"}`}>{job.title}</h3><p className="text-sm text-slate-600 flex items-center gap-1"><Building2 size={14}/>{job.institution}</p></div>
        </div>
        {expired&&<Badge>Expired</Badge>}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">{job.subjects?.slice(0,3).map(s=><span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>)}{job.subjects?.length>3&&<span className="text-xs text-slate-400">+{job.subjects.length-3}</span>}</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">{job.cities?.join(", ")}</span>
        <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Briefcase size={12}/>{job.employmentType}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3"><Badge>{job.ownership}</Badge>{job.verified&&<span className="text-xs text-emerald-600 font-medium">✓ Verified</span>}{job.postedBy==="admin"&&<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⭐ Official</span>}</div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <p className="text-sm font-semibold text-slate-900">₹{(job.salaryMin/1000).toFixed(0)}K - ₹{(job.salaryMax/1000).toFixed(0)}K<span className="font-normal text-slate-500"> /mo</span></p>
        <p className="text-xs text-slate-400">Deadline: {job.deadline}</p>
      </div>
    </Card>
  );
};

// ============================================================
// HOME PAGE
// ============================================================
const HomePage = ({ onNavigate, jobs, user, categories }) => {
  const visible = jobs.filter(isJobVisible);
  return (
    <div>
      <section className="bg-slate-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-slate-900">Featured Teaching Jobs</h2><Button variant="ghost" onClick={()=>onNavigate("jobs")}>View All<ArrowRight size={16} className="ml-1"/></Button></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{visible.filter(j=>j.featured).slice(0,6).map(j=><JobCard key={j.id} job={j} categories={categories} onClick={()=>onNavigate("job-detail",{jobId:j.id})}/>)}</div>
        </div>
      </section>
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><Shield size={20} className="text-emerald-600"/></div><h2 className="text-2xl font-bold text-slate-900">Government Jobs</h2></div><Button variant="ghost" onClick={()=>onNavigate("jobs",{ownership:"Government"})}>View All<ArrowRight size={16} className="ml-1"/></Button></div>
          <div className="grid md:grid-cols-2 gap-4">{visible.filter(j=>j.ownership==="Government").slice(0,4).map(j=><JobCard key={j.id} job={j} categories={categories} onClick={()=>onNavigate("job-detail",{jobId:j.id})} compact/>)}</div>
        </div>
      </section>
      <section className="bg-slate-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Building2 size={20} className="text-blue-600"/></div><h2 className="text-2xl font-bold text-slate-900">Private Institution Jobs</h2></div><Button variant="ghost" onClick={()=>onNavigate("jobs",{ownership:"Private"})}>View All<ArrowRight size={16} className="ml-1"/></Button></div>
          <div className="grid md:grid-cols-2 gap-4">{visible.filter(j=>j.ownership==="Private").slice(0,4).map(j=><JobCard key={j.id} job={j} categories={categories} onClick={()=>onNavigate("job-detail",{jobId:j.id})} compact/>)}</div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-none text-white"><div className="p-3 bg-amber-500/20 rounded-xl w-fit mb-4"><User size={24} className="text-amber-400"/></div><h3 className="text-xl font-bold mb-2">For Educators</h3><p className="text-slate-300 mb-6 text-sm">Create your teaching profile and get discovered by top institutions.</p><Button variant="accent" onClick={()=>onNavigate(user?"candidate-dashboard":"register")}>{user?"Dashboard":"Create Profile"}<ArrowRight size={16} className="ml-2"/></Button></Card>
          <Card className="p-8 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200"><div className="p-3 bg-amber-500/20 rounded-xl w-fit mb-4"><Building2 size={24} className="text-amber-600"/></div><h3 className="text-xl font-bold text-slate-900 mb-2">For Institutions</h3><p className="text-slate-600 mb-6 text-sm">Post vacancies, manage applications, and hire the best educators.</p><Button variant="primary" onClick={()=>onNavigate(user?.role==="recruiter"?"recruiter-dashboard":"register")}>Post Vacancy<ArrowRight size={16} className="ml-2"/></Button></Card>
        </div>
      </section>
    </div>
  );
};

// ============================================================
// JOB LISTING PAGE
// ============================================================
const JobListingPage = ({ jobs, onNavigate, filters:initF, categories }) => {
  const [f, setF] = useState({ keyword:"",category:"",subject:"",state:"",city:"",ownership:"",academicLevel:"",employmentType:"",workMode:"",...initF });
  const [showF, setShowF] = useState(false);
  const visible = useMemo(()=>jobs.filter(j=>{
    if(!isJobVisible(j))return false;
    if(f.keyword&&!j.title.toLowerCase().includes(f.keyword.toLowerCase())&&!j.subjects?.some(s=>s.toLowerCase().includes(f.keyword.toLowerCase()))&&!j.institution.toLowerCase().includes(f.keyword.toLowerCase()))return false;
    if(f.category&&!j.categories?.includes(f.category))return false;
    if(f.subject&&!j.subjects?.includes(f.subject))return false;
    if(f.state&&!j.states?.includes(f.state))return false;
    if(f.city&&!j.cities?.includes(f.city))return false;
    if(f.ownership&&j.ownership!==f.ownership)return false;
    if(f.academicLevel&&j.academicLevel!==f.academicLevel)return false;
    if(f.employmentType&&j.employmentType!==f.employmentType)return false;
    if(f.workMode&&j.workMode!==f.workMode)return false;
    return true;
  }),[jobs,f]);
  const selCat = categories.find(c=>c.id===f.category);
  const allCities = f.state&&CITIES[f.state]?CITIES[f.state]:[];
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {(f.category||f.subject)&&<div className="flex items-center gap-2 mb-4 flex-wrap"><span className="text-sm text-slate-500">Filtering:</span>{f.category&&<span className="inline-flex items-center gap-1 bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-medium">{categories.find(c=>c.id===f.category)?.icon} {categories.find(c=>c.id===f.category)?.name}<button onClick={()=>setF(p=>({...p,category:"",subject:""}))}><X size={12}/></button></span>}{f.subject&&<span className="inline-flex items-center gap-1 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-medium">{f.subject}<button onClick={()=>setF(p=>({...p,subject:""}))}><X size={12}/></button></span>}</div>}
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Teaching Vacancies</h1><p className="text-sm text-slate-500">{visible.length} jobs found</p></div>
        <Button variant="secondary" className="lg:hidden" onClick={()=>setShowF(!showF)}><Filter size={16} className="mr-2"/>Filters</Button>
      </div>
      <div className="flex gap-6">
        <div className={`${showF?"fixed inset-0 z-50 bg-white p-4 overflow-y-auto":"hidden"} lg:block lg:static lg:w-72 lg:shrink-0`}>
          {showF&&<div className="flex items-center justify-between mb-4 lg:hidden"><h2 className="text-lg font-bold">Filters</h2><button onClick={()=>setShowF(false)}><X size={20}/></button></div>}
          <Card className="p-5 space-y-4 sticky top-24">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2"><Filter size={16}/>Filters</h3>
            <Input label="Keyword" placeholder="Search..." value={f.keyword} onChange={e=>setF(p=>({...p,keyword:e.target.value}))}/>
            <Select label="Category" options={categories.map(c=>({value:c.id,label:`${c.icon} ${c.name}`}))} value={f.category} onChange={e=>setF(p=>({...p,category:e.target.value,subject:""}))}/>
            {selCat&&<Select label="Subject" options={selCat.subjects} value={f.subject} onChange={e=>setF(p=>({...p,subject:e.target.value}))}/>}
            <Select label="State" options={STATES_LIST} value={f.state} onChange={e=>setF(p=>({...p,state:e.target.value,city:""}))}/>
            {allCities.length>0&&<Select label="City" options={allCities} value={f.city} onChange={e=>setF(p=>({...p,city:e.target.value}))}/>}
            <Select label="Ownership" options={OWNERSHIP_TYPES} value={f.ownership} onChange={e=>setF(p=>({...p,ownership:e.target.value}))}/>
            <Select label="Academic Level" options={ACADEMIC_LEVELS} value={f.academicLevel} onChange={e=>setF(p=>({...p,academicLevel:e.target.value}))}/>
            <Select label="Employment Type" options={EMPLOYMENT_TYPES} value={f.employmentType} onChange={e=>setF(p=>({...p,employmentType:e.target.value}))}/>
            <Select label="Work Mode" options={WORK_MODES} value={f.workMode} onChange={e=>setF(p=>({...p,workMode:e.target.value}))}/>
            <Button variant="ghost" className="w-full" onClick={()=>setF({keyword:"",category:"",subject:"",state:"",city:"",ownership:"",academicLevel:"",employmentType:"",workMode:""})}>Clear All</Button>
          </Card>
        </div>
        <div className="flex-1 space-y-4">{visible.length===0?<EmptyState icon={Search} title="No jobs found" description="Try adjusting filters."/>:visible.map(j=><JobCard key={j.id} job={j} categories={categories} onClick={()=>onNavigate("job-detail",{jobId:j.id})}/>)}</div>
      </div>
    </div>
  );
};

// ============================================================
// JOB DETAIL
// ============================================================
const JobDetailPage = ({ job, onNavigate, user, applications, onApply, categories }) => {
  if(!job)return<div className="max-w-7xl mx-auto px-4 py-16 text-center"><p>Job not found.</p></div>;
  const hasApplied = applications.some(a=>a.jobId===job.id&&a.candidateId===user?.id);
  const expired = isExpired(job.deadline);
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button onClick={()=>onNavigate("jobs")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"><ArrowLeft size={16}/>Back</button>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            {expired&&<div className="mb-4 p-3 bg-red-50 rounded-lg text-sm text-red-700 flex items-center gap-2"><AlertCircle size={16}/>This posting has expired.</div>}
            {job.postedBy==="admin"&&<div className="mb-3"><span className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full">⭐ Official Posting by Admin</span></div>}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-2xl shrink-0">{categories.find(c=>job.categories?.includes(c.id))?.icon}</div>
              <div><h1 className="text-2xl font-bold text-slate-900 mb-1">{job.title}</h1><p className="text-lg text-slate-600">{job.institution}</p><div className="flex flex-wrap gap-2 mt-2"><Badge>{job.ownership}</Badge><Badge>{job.employmentType}</Badge>{job.verified&&<span className="text-xs text-emerald-600 font-medium">✓ Verified</span>}</div></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl">
              <div><p className="text-xs text-slate-500">Locations</p><p className="text-sm font-semibold">{job.cities?.join(", ")}</p></div>
              <div><p className="text-xs text-slate-500">Salary</p><p className="text-sm font-semibold">₹{(job.salaryMin/1000).toFixed(0)}K-₹{(job.salaryMax/1000).toFixed(0)}K</p></div>
              <div><p className="text-xs text-slate-500">Level</p><p className="text-sm font-semibold">{job.academicLevel}</p></div>
              <div><p className="text-xs text-slate-500">Vacancies</p><p className="text-sm font-semibold">{job.vacancies||"—"}</p></div>
            </div>
          </Card>
          <Card className="p-6"><h2 className="text-lg font-bold mb-2">Subjects</h2><div className="flex flex-wrap gap-2">{job.subjects?.map(s=><span key={s} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">{s}</span>)}</div></Card>
          <Card className="p-6"><h2 className="text-lg font-bold mb-3">Job Description</h2><p className="text-sm text-slate-600 leading-relaxed">{job.description}</p>{job.source_url&&<a href={job.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 mt-3 hover:underline"><ExternalLink size={12}/>Original Source</a>}</Card>
        </div>
        <div>
          <Card className="p-6 sticky top-24 space-y-4">
            {user?.role==="candidate"&&!expired?(hasApplied?<Button variant="secondary" className="w-full" disabled>Applied ✓</Button>:<Button variant="primary" className="w-full" size="lg" onClick={()=>onApply(job.id)}>Apply Now</Button>):!user&&!expired?<Button variant="primary" className="w-full" size="lg" onClick={()=>onNavigate("login")}>Login to Apply</Button>:expired?<Button variant="secondary" className="w-full" disabled>Job Expired</Button>:null}
            <div className="pt-4 border-t border-slate-200 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Deadline</span><span className={`font-medium ${expired?"text-red-600":""}`}>{job.deadline}</span></div>
              {job.applicants>0&&<div className="flex justify-between"><span className="text-slate-500">Applicants</span><span className="font-medium">{job.applicants}</span></div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// AUTH
// ============================================================
const LoginPage = ({ onLogin, onNavigate }) => {
  const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const submit=async()=>{
    if(!email||!pw){setErr("Please enter email and password.");return;}
    setLoading(true);setErr("");
    try{const u=await dbSignIn(email,pw);onLogin(u);}
    catch(e){setErr(e.message||"Invalid credentials.");}
    finally{setLoading(false);}
  };
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8"><h1 className="text-2xl font-bold">Welcome Back</h1><p className="text-sm text-slate-500 mt-1">Sign in to TeachHire</p></div>
        {err&&<div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{err}</div>}
        <div className="space-y-4">
          <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          <Input label="Password" type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          <Button variant="primary" className="w-full" size="lg" onClick={submit} disabled={loading}>{loading?"Signing in...":"Sign In"}</Button>
        </div>
        <p className="text-sm text-center mt-6 text-slate-500">No account? <button onClick={()=>onNavigate("register")} className="text-slate-900 font-semibold hover:underline">Sign Up</button></p>
      </Card>
    </div>
  );
};
const RegisterPage = ({ onNavigate, onLogin }) => {
  const [role,setRole]=useState("candidate");
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [phone,setPhone]=useState(""); const [pw,setPw]=useState(""); const [institution,setInstitution]=useState("");
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false); const [success,setSuccess]=useState(false);
  const submit=async()=>{
    if(!name||!email||!pw){setErr("Name, email, and password are required.");return;}
    if(pw.length<8){setErr("Password must be at least 8 characters.");return;}
    if(role==="recruiter"&&!institution){setErr("Institution name is required for recruiters.");return;}
    setLoading(true);setErr("");
    try{
      await dbSignUp(email,pw,name,role,institution);
      setSuccess(true);
    }catch(e){setErr(e.message||"Registration failed.");}
    finally{setLoading(false);}
  };
  if(success)return(
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">Account Created!</h1>
        <p className="text-slate-500 text-sm mb-6">Please check your email <strong>{email}</strong> and click the confirmation link to activate your account.</p>
        <Button variant="primary" className="w-full" onClick={()=>onNavigate("login")}>Go to Sign In</Button>
      </Card>
    </div>
  );
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg p-8">
        <div className="text-center mb-8"><h1 className="text-2xl font-bold">Create Account</h1></div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[{id:"candidate",icon:User,l:"I'm a Candidate",d:"Looking for teaching jobs"},{id:"recruiter",icon:Building2,l:"I'm a Recruiter",d:"Hiring educators"}].map(r=>(
            <button key={r.id} onClick={()=>setRole(r.id)} className={`p-4 rounded-xl border-2 text-left transition-all ${role===r.id?"border-slate-800 bg-slate-50":"border-slate-200"}`}><r.icon size={20} className={role===r.id?"text-slate-800":"text-slate-400"}/><p className="text-sm font-semibold mt-2">{r.l}</p><p className="text-xs text-slate-500">{r.d}</p></button>
          ))}
        </div>
        {err&&<div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{err}</div>}
        <div className="space-y-4">
          <Input label="Full Name *" placeholder="Enter your name" value={name} onChange={e=>setName(e.target.value)}/>
          <Input label="Email *" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          <PhoneInput label="Phone" value={phone} onChange={setPhone}/>
          <Input label="Password *" type="password" placeholder="Min 8 characters" value={pw} onChange={e=>setPw(e.target.value)}/>
          {role==="recruiter"&&<><Input label="Institution Name *" placeholder="Your school/college/university" value={institution} onChange={e=>setInstitution(e.target.value)}/><p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">⚠ Institution needs admin verification before posting jobs.</p></>}
          <Button variant="primary" className="w-full" size="lg" onClick={submit} disabled={loading}>{loading?"Creating account...":"Create Account"}</Button>
        </div>
        <p className="text-sm text-center mt-6 text-slate-500">Already registered? <button onClick={()=>onNavigate("login")} className="text-slate-900 font-semibold hover:underline">Sign In</button></p>
      </Card>
    </div>
  );
};

// ============================================================
// JOB POSTING FORM
// ============================================================
const JobPostingForm = ({ onSubmit, onCancel, user, isAdmin=false, categories }) => {
  const allSubjectNames = [...new Set(categories.flatMap(c=>c.subjects))];
  const [form,setForm]=useState({title:"",categories:[],subjects:[],institutionCategory:"",ownership:"",academicLevel:"",employmentType:"",states:[],cities:[],workMode:"",minQualification:"",salaryMin:"",salaryMax:"",deadline:"",vacancies:"1",description:"",demoClass:false,writtenTest:false,rounds:"1",institution:isAdmin?"":user?.institution?.name||""});
  const u=(k,v)=>setForm(f=>({...f,[k]:v}));
  const availableCities=form.states.flatMap(st=>CITIES[st]||[]);
  const handle=status=>onSubmit({...form,id:Date.now(),status,institution:form.institution||user?.institution?.name,recruiterId:user?.id,verified:isAdmin||user?.institution?.verified,postedDate:TODAY,applicants:0,featured:false,postedBy:isAdmin?"admin":"recruiter",salaryMin:Number(form.salaryMin),salaryMax:Number(form.salaryMax),vacancies:Number(form.vacancies),rounds:Number(form.rounds)});
  return (
    <div className="space-y-6">
      {!isAdmin&&!user?.institution?.verified&&<div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2"><AlertCircle size={18} className="shrink-0 mt-0.5"/><div><p className="font-semibold">Institution not verified</p><p>Job will need admin approval.</p></div></div>}
      {isAdmin&&<Input label="Institution Name *" placeholder="Enter institution name" value={form.institution} onChange={e=>u("institution",e.target.value)}/>}
      <Input label="Job Title *" placeholder="e.g. Assistant Professor - Computer Science" value={form.title} onChange={e=>u("title",e.target.value)}/>
      <MultiSelect label="Categories *" options={categories.map(c=>c.id)} value={form.categories} onChange={v=>u("categories",v)} placeholder="Select categories..."/>
      <MultiSelect label="Subjects *" options={allSubjectNames} value={form.subjects} onChange={v=>u("subjects",v)} allowCustom placeholder="Select or type subjects..."/>
      <div className="grid md:grid-cols-2 gap-4">
        <Select label="Institution Category" options={INSTITUTION_CATEGORIES} value={form.institutionCategory} onChange={e=>u("institutionCategory",e.target.value)}/>
        <Select label="Ownership Type" options={OWNERSHIP_TYPES} value={form.ownership} onChange={e=>u("ownership",e.target.value)}/>
        <Select label="Academic Level" options={ACADEMIC_LEVELS} value={form.academicLevel} onChange={e=>u("academicLevel",e.target.value)}/>
        <Select label="Employment Type" options={EMPLOYMENT_TYPES} value={form.employmentType} onChange={e=>u("employmentType",e.target.value)}/>
      </div>
      <MultiSelect label="States *" options={STATES_LIST} value={form.states} onChange={v=>{u("states",v);u("cities",form.cities.filter(c=>v.flatMap(s=>CITIES[s]||[]).includes(c)));}} allowCustom placeholder="Select states..."/>
      <MultiSelect label="Cities" options={availableCities} value={form.cities} onChange={v=>u("cities",v)} allowCustom placeholder="Select cities..."/>
      <div className="grid md:grid-cols-2 gap-4">
        <Select label="Work Mode" options={WORK_MODES} value={form.workMode} onChange={e=>u("workMode",e.target.value)}/>
        <Select label="Min Qualification" options={QUALIFICATIONS} value={form.minQualification} onChange={e=>u("minQualification",e.target.value)}/>
        <Input label="Min Salary (₹/month)" type="number" value={form.salaryMin} onChange={e=>u("salaryMin",e.target.value)}/>
        <Input label="Max Salary (₹/month)" type="number" value={form.salaryMax} onChange={e=>u("salaryMax",e.target.value)}/>
        <Input label="Deadline *" type="date" value={form.deadline} onChange={e=>u("deadline",e.target.value)}/>
        <Input label="Vacancies" type="number" value={form.vacancies} onChange={e=>u("vacancies",e.target.value)}/>
      </div>
      <Textarea label="Job Description *" value={form.description} onChange={e=>u("description",e.target.value)} placeholder="Describe the role..."/>
      <div className="flex gap-3 pt-4 border-t">
        {isAdmin||user?.institution?.verified?<Button onClick={()=>handle("Published")}>Publish Now</Button>:<Button onClick={()=>handle("Pending Approval")}>Submit for Approval</Button>}
        <Button variant="secondary" onClick={()=>handle("Draft")}>Save Draft</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

// ============================================================
// CANDIDATE DASHBOARD
// ============================================================
const CandidateDashboard = ({ user, applications, jobs, onNavigate }) => {
  const [tab,setTab]=useState("overview");
  const myApps=applications.filter(a=>a.candidateId===user.id);
  const upcomingIVs=myApps.flatMap(a=>a.rounds.filter(r=>r.status==="scheduled").map(r=>({...r,job:jobs.find(j=>j.id===a.jobId)})));
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6"><h1 className="text-2xl font-bold">Welcome, {user.name?.split(" ")[0]}!</h1></div>
      <Tabs tabs={[{id:"overview",label:"Overview"},{id:"applications",label:"My Applications",count:myApps.length},{id:"interviews",label:"Interviews",count:upcomingIVs.length},{id:"profile",label:"My Profile"}]} active={tab} onChange={setTab}/>
      <div className="mt-6">
        {tab==="overview"&&<div className="space-y-6"><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><StatCard icon={FileText} label="Applications" value={myApps.length} color="blue"/><StatCard icon={CheckCircle2} label="Shortlisted" value={myApps.filter(a=>["Shortlisted","Selected"].includes(a.status)).length} color="emerald"/><StatCard icon={Calendar} label="Interviews" value={upcomingIVs.length} color="purple"/><StatCard icon={Star} label="Profile Score" value="72%" color="amber"/></div><Card className="p-5"><div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Recent Applications</h3><Button variant="ghost" size="sm" onClick={()=>setTab("applications")}>View All</Button></div><div className="space-y-3">{myApps.slice(0,5).map(app=>{const job=jobs.find(j=>j.id===app.jobId);return<div key={app.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div><p className="text-sm font-medium">{job?.title}</p><p className="text-xs text-slate-500">{job?.institution}</p></div><Badge>{app.status}</Badge></div>})}</div></Card></div>}
        {tab==="applications"&&<div className="space-y-4">{myApps.map(app=>{const job=jobs.find(j=>j.id===app.jobId);return<Card key={app.id} className="p-5"><div className="flex items-start justify-between mb-3"><div><h3 className="font-semibold">{job?.title}</h3><p className="text-sm text-slate-600">{job?.institution}</p><p className="text-xs text-slate-400 mt-1">Applied {app.appliedDate}</p></div><Badge>{app.status}</Badge></div>{app.rounds.length>0&&<div className="mt-3 pt-3 border-t space-y-2">{app.rounds.map((r,i)=><div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg text-sm"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${r.result==="pass"?"bg-emerald-100 text-emerald-700":r.status==="scheduled"?"bg-blue-100 text-blue-700":"bg-slate-200 text-slate-500"}`}>{r.number}</div><div className="flex-1"><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.date}·{r.mode}</p></div><Badge>{r.result||r.status}</Badge></div>)}</div>}</Card>})}</div>}
        {tab==="interviews"&&<div className="space-y-4">{upcomingIVs.length===0?<EmptyState icon={Calendar} title="No interviews" description="Upcoming interviews appear here."/>:upcomingIVs.map((iv,i)=><Card key={i} className="p-5"><div className="flex items-start justify-between mb-3"><div><h3 className="font-semibold">{iv.name}</h3><p className="text-sm text-slate-600">{iv.job?.title}</p></div><Badge>{iv.status}</Badge></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl text-sm"><div><span className="text-xs text-slate-500">Date</span><p className="font-medium">{iv.date}</p></div><div><span className="text-xs text-slate-500">Time</span><p className="font-medium">{iv.startTime}-{iv.endTime}</p></div><div><span className="text-xs text-slate-500">Mode</span><p className="font-medium">{iv.mode}</p></div><div><span className="text-xs text-slate-500">Interviewer</span><p className="font-medium">{iv.interviewer}</p></div></div>{iv.instructions&&<p className="mt-3 text-sm text-slate-600 p-3 bg-amber-50 rounded-lg"><Info size={14} className="inline mr-1 text-amber-500"/>{iv.instructions}</p>}</Card>)}</div>}
        {tab==="profile"&&<div className="max-w-3xl space-y-6"><Card className="p-6"><h3 className="font-semibold mb-4">Personal Information</h3><div className="grid md:grid-cols-2 gap-4"><Input label="Full Name" defaultValue={user.name}/><Input label="Email" defaultValue={user.email}/><Input label="Phone" defaultValue={user.phone}/></div><Textarea label="Professional Summary" className="mt-4" defaultValue="Passionate educator with 5+ years of experience."/></Card><Card className="p-6"><h3 className="font-semibold mb-4">Documents</h3><div className="grid md:grid-cols-2 gap-4">{["Resume / CV","Profile Photo","Educational Certificates","Experience Certificates"].map(d=><div key={d} className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center hover:border-slate-400 cursor-pointer"><Upload size={24} className="text-slate-400 mx-auto mb-2"/><p className="text-sm font-medium">{d}</p></div>)}</div></Card><Button variant="primary">Save Profile</Button></div>}
      </div>
    </div>
  );
};

// ============================================================
// RECRUITER DASHBOARD
// ============================================================
const RecruiterDashboard = ({ user, jobs, applications, onNavigate, onUpdateApp, onAddJob, onArchiveJob, onUnarchiveJob, categories, onRequestSubject }) => {
  const [tab,setTab]=useState("overview");
  const [showJobForm,setShowJobForm]=useState(false);
  const [showIVModal,setShowIVModal]=useState(false);
  const [showSubjectModal,setShowSubjectModal]=useState(false);
  const [jobFilter,setJobFilter]=useState("active");
  const myJobs=jobs.filter(j=>j.recruiterId===user.id);
  const activeJobs=myJobs.filter(j=>j.status!=="Archived");
  const archivedJobs=myJobs.filter(j=>j.status==="Archived");
  const allApps=applications.filter(a=>myJobs.some(j=>j.id===a.jobId));
  const displayedJobs=jobFilter==="archived"?archivedJobs:activeJobs;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Recruiter Dashboard</h1><p className="text-sm text-slate-500 flex items-center gap-2">{user.institution?.name}{user.institution?.verified?<span className="text-emerald-600 text-xs font-medium">✓ Verified</span>:<span className="text-amber-600 text-xs">⚠ Unverified</span>}</p></div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={()=>setShowSubjectModal(true)}><Tag size={15} className="mr-1.5"/>Request Subject</Button>
          <Button onClick={()=>setShowJobForm(true)}><Plus size={16} className="mr-2"/>Post Vacancy</Button>
        </div>
      </div>
      {!user.institution?.verified&&<div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3"><AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5"/><div><p className="font-semibold text-amber-800 text-sm">Institution Not Verified</p><p className="text-xs text-amber-700 mt-1">Your job postings will need admin approval.</p></div></div>}
      <Tabs tabs={[{id:"overview",label:"Overview"},{id:"jobs",label:"My Vacancies",count:myJobs.length},{id:"applicants",label:"Applicants",count:allApps.length},{id:"institution",label:"Institution"}]} active={tab} onChange={setTab}/>
      <div className="mt-6">
        {tab==="overview"&&<div className="space-y-6"><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><StatCard icon={Briefcase} label="Active Jobs" value={activeJobs.filter(j=>j.status==="Published").length} color="blue"/><StatCard icon={Users} label="Applicants" value={allApps.length} color="purple"/><StatCard icon={AlertCircle} label="Pending Approval" value={myJobs.filter(j=>j.status==="Pending Approval").length} color="amber"/><StatCard icon={Bookmark} label="Archived" value={archivedJobs.length} color="slate"/></div></div>}
        {tab==="jobs"&&(
          <div className="space-y-4">
            <div className="flex gap-2">
              {[{v:"active",l:`Active (${activeJobs.length})`},{v:"archived",l:`Archived (${archivedJobs.length})`}].map(f=>(
                <button key={f.v} onClick={()=>setJobFilter(f.v)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${jobFilter===f.v?"bg-slate-800 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{f.l}</button>
              ))}
            </div>
            {displayedJobs.length===0?<EmptyState icon={Briefcase} title={jobFilter==="archived"?"No archived jobs":"No vacancies"} description={jobFilter==="archived"?"Archived jobs appear here.":"Post your first vacancy."} action={jobFilter==="active"&&<Button onClick={()=>setShowJobForm(true)}>Post Vacancy</Button>}/>:
            displayedJobs.map(j=>(
              <Card key={j.id} className={`p-5 ${j.status==="Archived"?"opacity-70 border-dashed":""}`}>
                <div className="flex items-start justify-between">
                  <div><h3 className="font-semibold">{j.title}</h3><p className="text-xs text-slate-500 mt-1">{j.cities?.join(", ")} · {j.applicants} applicants</p><div className="flex gap-2 mt-2"><Badge>{j.status}</Badge>{j.archivedBy==="system"&&<span className="text-xs text-slate-400 italic">Auto-archived (expired)</span>}{j.archivedBy==="admin"&&<span className="text-xs text-slate-400 italic">Archived by Admin</span>}</div></div>
                  <div className="flex gap-2">
                    {j.status!=="Archived"?<Button variant="ghost" size="sm" onClick={()=>onArchiveJob(j.id,String(user.id))} title="Archive"><Bookmark size={14} className="text-slate-500"/></Button>:<Button variant="ghost" size="sm" onClick={()=>onUnarchiveJob(j.id)} title="Restore"><RefreshCw size={14} className="text-slate-500"/></Button>}
                    <Button variant="ghost" size="sm"><Eye size={14}/></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {tab==="applicants"&&<div className="space-y-4">{allApps.map(app=>{const job=jobs.find(j=>j.id===app.jobId);return<Card key={app.id} className="p-5"><div className="flex items-start justify-between mb-4"><div className="flex items-start gap-3"><div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-bold">PS</div><div><h3 className="font-semibold">Priya Sharma</h3><p className="text-sm text-slate-500">Applied for: {job?.title}</p></div></div><Badge>{app.status}</Badge></div><div className="flex flex-wrap gap-2"><Button variant="success" size="sm" onClick={()=>onUpdateApp(app.id,"Shortlisted")}><CheckCircle2 size={14} className="mr-1"/>Shortlist</Button><Button variant="danger" size="sm" onClick={()=>onUpdateApp(app.id,"Rejected")}><XCircle size={14} className="mr-1"/>Reject</Button><Button variant="primary" size="sm" onClick={()=>setShowIVModal(true)}><Calendar size={14} className="mr-1"/>Interview</Button></div></Card>})}</div>}
        {tab==="institution"&&<div className="max-w-3xl"><Card className="p-6"><div className="flex items-start justify-between mb-4"><h3 className="font-semibold">Institution Profile</h3>{user.institution?.verified?<Badge>Verified</Badge>:<Badge>Pending</Badge>}</div><div className="grid md:grid-cols-2 gap-4"><Input label="Name" value={user.institution?.name} readOnly/><Select label="Category" options={INSTITUTION_CATEGORIES} value={user.institution?.category}/><Select label="Ownership" options={OWNERSHIP_TYPES} value={user.institution?.ownership}/><Input label="State" value={user.institution?.state} readOnly/></div><Button variant="primary" className="mt-4">Update</Button></Card></div>}
      </div>
      <Modal open={showJobForm} onClose={()=>setShowJobForm(false)} title="Post New Vacancy" size="lg"><JobPostingForm onSubmit={j=>{onAddJob(j);setShowJobForm(false);}} onCancel={()=>setShowJobForm(false)} user={user} categories={categories}/></Modal>
      <Modal open={showIVModal} onClose={()=>setShowIVModal(false)} title="Schedule Interview"><div className="space-y-4"><Select label="Round Type *" options={ROUND_TYPES}/><div className="grid grid-cols-2 gap-4"><Input label="Interviewer *" placeholder="Dr. Sharma"/><Input label="Role" placeholder="HOD"/></div><div className="grid grid-cols-3 gap-4"><Input label="Date *" type="date"/><Input label="Start *" type="time"/><Input label="End *" type="time"/></div><Select label="Mode *" options={INTERVIEW_MODES}/><Textarea label="Instructions" placeholder="What to prepare..."/><div className="flex gap-3"><Button onClick={()=>setShowIVModal(false)}>Schedule</Button><Button variant="secondary" onClick={()=>setShowIVModal(false)}>Cancel</Button></div></div></Modal>
      <AddSubjectModal open={showSubjectModal} onClose={()=>setShowSubjectModal(false)} categories={categories} onAdd={()=>{}} onRequest={(catId, subject, note)=>onRequestSubject(catId, subject, note, user)} role="recruiter"/>
    </div>
  );
};

// ============================================================
// CUSTOM SOURCE STORE — localStorage persistence
// ============================================================
const LS_KEY = "teachhire_custom_sources";

function useCustomSources() {
  const [sources, setSources] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const save = (updated) => {
    setSources(updated);
    try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch {}
  };

  const add = (source) => save([...sources, { ...source, id: `custom_${Date.now()}`, addedDate: TODAY, lastFetchedCount: null, lastFetchedAt: null, fetchStatus: "never" }]);
  const remove = (id) => save(sources.filter(s => s.id !== id));
  const update = (id, patch) => save(sources.map(s => s.id === id ? { ...s, ...patch } : s));
  const updateFetchResult = (url, count, status) => save(
    sources.map(s => s.url === url ? { ...s, lastFetchedCount: count, lastFetchedAt: new Date().toLocaleString(), fetchStatus: status } : s)
  );

  return { sources, add, remove, update, updateFetchResult };
}

// ── Icon picker options
const SOURCE_ICON_OPTIONS = ["🔗","🏛️","🏫","🏥","⚙️","📘","📰","🎓","🔬","📋","🏙️","🌐","📝","💼","🇮🇳"];
const SOURCE_CATEGORY_OPTIONS = ["Central Govt","State Govt","University","School Board","Research Institute","Custom"];

const CustomSourceManager = ({ customSources, onAdd, onRemove, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ url: "", name: "", icon: "🔗", category: "Custom", notes: "" });
  const [urlError, setUrlError] = useState("");
  const [editingId, setEditingId] = useState(null);

  const validateUrl = (url) => {
    try { new URL(url); return true; } catch { return false; }
  };

  const handleAdd = () => {
    if (!validateUrl(form.url)) { setUrlError("Please enter a valid URL (must start with https://)"); return; }
    if (!form.name.trim()) { setUrlError("Please enter a name for this source"); return; }
    // Check duplicate
    if (customSources.some(s => s.url === form.url)) { setUrlError("This URL is already in your source list"); return; }
    onAdd({ ...form, url: form.url.trim() });
    setForm({ url: "", name: "", icon: "🔗", category: "Custom", notes: "" });
    setShowForm(false);
    setUrlError("");
  };

  const handleEdit = (src) => {
    setEditingId(src.id);
    setForm({ url: src.url, name: src.name, icon: src.icon, category: src.category, notes: src.notes || "" });
    setShowForm(true);
  };

  const handleUpdate = () => {
    onUpdate(editingId, { name: form.name, icon: form.icon, category: form.category, notes: form.notes });
    setEditingId(null);
    setForm({ url: "", name: "", icon: "🔗", category: "Custom", notes: "" });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Your Custom Sources</h3>
          <p className="text-xs text-slate-500 mt-0.5">{customSources.length} saved · Included automatically in every fetch</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ url:"", name:"", icon:"🔗", category:"Custom", notes:"" }); }}>
          <Plus size={15} className="mr-1.5" />Add URL
        </Button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <Card className="p-5 border-2 border-slate-800">
          <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Link size={16} />{editingId ? "Edit Source" : "Add New Source URL"}
          </h4>
          <div className="space-y-3">
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website URL *</label>
                <input
                  className={`w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-slate-400 ${urlError ? "border-red-400" : "border-slate-300"}`}
                  placeholder="https://example.edu.in/recruitment"
                  value={form.url}
                  onChange={e => { setForm(f => ({...f, url: e.target.value})); setUrlError(""); }}
                />
                {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Source Name *"
                placeholder="e.g. IIT Bombay Jobs"
                value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
              />
              <Select
                label="Category"
                options={SOURCE_CATEGORY_OPTIONS}
                value={form.category}
                onChange={e => setForm(f => ({...f, category: e.target.value}))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_ICON_OPTIONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setForm(f => ({...f, icon}))}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${form.icon === icon ? "bg-slate-800 ring-2 ring-slate-400" : "bg-slate-100 hover:bg-slate-200"}`}
                  >{icon}</button>
                ))}
              </div>
            </div>
            <Textarea
              label="Notes (optional)"
              placeholder="e.g. Check every Monday — posts new jobs weekly"
              value={form.notes}
              onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              className="text-xs"
            />
            <div className="flex gap-3 pt-2 border-t">
              <Button onClick={editingId ? handleUpdate : handleAdd}>
                {editingId ? "Save Changes" : <><Plus size={14} className="mr-1" />Save Source</>}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); setUrlError(""); }}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Source list */}
      {customSources.length === 0 && !showForm ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
          <div className="text-4xl mb-3">🔗</div>
          <p className="font-semibold text-slate-700 mb-1">No custom sources yet</p>
          <p className="text-sm text-slate-500 mb-4">Add any Indian university, state PSC, or recruitment website URL and it'll be scraped automatically.</p>
          <Button onClick={() => setShowForm(true)}><Plus size={14} className="mr-1.5" />Add Your First URL</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {customSources.map(src => (
            <Card key={src.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl shrink-0">{src.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{src.name}</p>
                      <a href={src.url} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline break-all flex items-center gap-1 mt-0.5">
                        <ExternalLink size={10} />{src.url}
                      </a>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(src)}><Edit size={13} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => onRemove(src.id)}><Trash2 size={13} className="text-red-400" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{src.category}</span>
                    <span className="text-xs text-slate-400">Added {src.addedDate}</span>
                    {src.fetchStatus === "never" && <span className="text-xs text-slate-400">· Never fetched</span>}
                    {src.fetchStatus === "ok" && <span className="text-xs text-emerald-600">· ✓ {src.lastFetchedCount} jobs · {src.lastFetchedAt}</span>}
                    {src.fetchStatus === "error" && <span className="text-xs text-red-500">· ✗ Error on last fetch</span>}
                  </div>
                  {src.notes && <p className="text-xs text-slate-500 mt-1.5 italic bg-slate-50 px-2 py-1 rounded">📝 {src.notes}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {customSources.length > 0 && (
        <p className="text-xs text-slate-400 text-center pt-2">
          These {customSources.length} URL{customSources.length > 1 ? "s" : ""} are saved in your browser and sent automatically every time you fetch jobs.
        </p>
      )}
    </div>
  );
};

// ============================================================
// SCRAPED JOBS TAB — with LIVE fetch from /api/fetch-jobs
// ============================================================
const ScrapedJobsTab = ({ scrapedJobs, setScrapedJobs, onPublish, scraperConfigs, setScraperConfigs }) => {
  const [subTab, setSubTab] = useState("live");
  const [editJob, setEditJob] = useState(null);
  const [filter, setFilter] = useState("pending_review");

  // ── Custom sources persisted in localStorage
  const { sources: customSources, add: addCustomSource, remove: removeCustomSource, update: updateCustomSource, updateFetchResult } = useCustomSources();

  // Live fetch state
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const pending   = scrapedJobs.filter(j => j.status === "pending_review");
  const published = scrapedJobs.filter(j => j.status === "published");
  const rejected  = scrapedJobs.filter(j => j.status === "rejected");
  const filtered  = filter === "all" ? scrapedJobs : scrapedJobs.filter(j => j.status === filter);

  const sourceInfo = siteId => SOURCE_SITES.find(s => s.id === siteId) || SOURCE_SITES.find(s => s.id === "custom");

  const fetchLiveJobs = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/fetch-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customSources: customSources.map(s => ({
            url: s.url, name: s.name, icon: s.icon,
            category: s.category, addedDate: s.addedDate, notes: s.notes,
          })),
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      // Update fetch status on each custom source
      (data.sourceStats || []).forEach(stat => {
        if (stat.isCustom) updateFetchResult(stat.url, stat.count, stat.status);
      });

      const existingTitles = new Set(scrapedJobs.map(j => j.title.toLowerCase().slice(0, 60)));
      const newJobs = (data.jobs || []).filter(
        j => !existingTitles.has(j.title.toLowerCase().slice(0, 60))
      );
      if (newJobs.length > 0) setScrapedJobs(prev => [...newJobs, ...prev]);

      setFetchResult({
        sourceStats: data.sourceStats || [],
        total: data.total || 0,
        newCount: newJobs.length,
        fetchedAt: data.fetchedAt,
      });
      setLastFetched(new Date().toLocaleTimeString());
    } catch (err) {
      setFetchError(err.message || "Failed to fetch jobs.");
    } finally {
      setFetching(false);
    }
  };

  // Publish scraped job → main job board
  const handlePublish = sj => {
    const nj = {
      id: Date.now(),
      title: sj.title,
      institution: sj.institution,
      categories: sj.categories || [],
      subjects: sj.subjects || [],
      states: sj.states || [],
      cities: sj.cities || [],
      ownership: sj.ownership || "Government",
      academicLevel: sj.academicLevel || "UG",
      employmentType: sj.employmentType || "Full-time",
      workMode: "Onsite",
      salaryMin: sj.salaryMin || 0,
      salaryMax: sj.salaryMax || 0,
      deadline: sj.deadline,
      description: sj.description,
      source_url: sj.source_url,
      status: "Published",
      postedDate: TODAY,
      recruiterId: 3,
      verified: true,
      applicants: 0,
      featured: false,
      postedBy: "admin",
      demoClass: false,
      writtenTest: false,
      rounds: 1,
      vacancies: sj.vacancies || 1,
    };
    onPublish(nj);
    setScrapedJobs(p => p.map(j => j.id === sj.id ? { ...j, status: "published" } : j));
  };

  const handlePublishAll = () => {
    pending.forEach(j => handlePublish(j));
  };

  const handleReject  = id => setScrapedJobs(p => p.map(j => j.id === id ? { ...j, status: "rejected" } : j));
  const handleRestore = id => setScrapedJobs(p => p.map(j => j.id === id ? { ...j, status: "pending_review" } : j));

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: "live",    label: "🌐 Live Fetch" },
          { id: "queue",   label: `Review Queue`, count: pending.length },
          { id: "custom",  label: `My URLs`, count: customSources.length || null },
          { id: "sources", label: "Built-in Sources" },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${subTab === t.id ? "border-slate-800 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t.label}
            {t.count > 0 && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${t.id === "queue" ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-700"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── LIVE FETCH TAB ── */}
      {subTab === "live" && (
        <div className="space-y-5">
          {/* Hero fetch card */}
          <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-none text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                  <Database size={20} className="text-amber-400" />
                  Live Job Fetcher
                </h3>
                <p className="text-slate-300 text-sm mb-2 max-w-lg">
                  Fetches real teaching jobs from <strong className="text-white">7 built-in sources</strong>
                  {customSources.length > 0 && <> + <strong className="text-amber-400">{customSources.length} custom URL{customSources.length > 1 ? "s" : ""} you saved</strong></>}.
                  All parsed and filtered automatically.
                </p>
                {customSources.length === 0 && (
                  <button onClick={() => setSubTab("custom")} className="text-xs text-amber-400 hover:text-amber-300 underline mb-3 block">
                    + Add your own university/PSC URLs →
                  </button>
                )}
                {lastFetched && (
                  <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                    <Clock3 size={12} /> Last fetched at {lastFetched}
                    {fetchResult && <span className="ml-2 text-emerald-400">· {fetchResult.newCount} new jobs added</span>}
                  </p>
                )}
                <Button variant="accent" onClick={fetchLiveJobs} disabled={fetching} size="lg">
                  {fetching
                    ? <><RefreshCw size={16} className="mr-2 animate-spin" />Fetching from {7 + customSources.length} sources...</>
                    : <><RefreshCw size={16} className="mr-2" />Fetch All Live Jobs ({7 + customSources.length} sources)</>}
                </Button>
              </div>
              <div className="shrink-0 hidden md:block">
                <div className="grid grid-cols-2 gap-2 text-center">
                  {[
                    { label: "Sources", val: 7 + customSources.length },
                    { label: "Pending", val: pending.length },
                    { label: "Published", val: published.length },
                    { label: "Custom URLs", val: customSources.length },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-700/50 rounded-xl p-3">
                      <p className="text-xl font-bold text-white">{s.val}</p>
                      <p className="text-xs text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Error */}
          {fetchError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Fetch failed</p>
                <p className="text-xs text-red-600 mt-1">{fetchError}</p>
                <p className="text-xs text-red-500 mt-1">
                  Make sure this app is deployed on Vercel (the /api/fetch-jobs endpoint won't work on localhost without extra setup).
                </p>
              </div>
            </div>
          )}

          {/* Source status cards */}
          {fetchResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900 text-sm">Source Results</h4>
                <span className="text-xs text-slate-500">{fetchResult.total} total jobs found · {fetchResult.newCount} new</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {fetchResult.sourceStats.map(src => (
                  <div key={src.id}
                    className={`p-4 rounded-xl border-2 ${src.status === "ok" && src.count > 0 ? "border-emerald-200 bg-emerald-50" : src.status === "ok" ? "border-slate-200 bg-slate-50" : "border-red-200 bg-red-50"}`}>
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{src.icon}</span>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{src.name}</p>
                          <p className="text-xs text-slate-400">{src.category}</p>
                        </div>
                      </div>
                      {src.status === "ok"
                        ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${src.count > 0 ? "bg-emerald-200 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{src.count} jobs</span>
                        : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-800">Error</span>
                      }
                    </div>
                    {src.error && <p className="text-xs text-red-600 mt-1 truncate" title={src.error}>{src.error}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* "No fetch yet" placeholder */}
          {!fetchResult && !fetchError && !fetching && (
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon:"📰", name:"Employment News", cat:"Central Govt", desc:"Education RSS feed — most reliable" },
                { icon:"🏫", name:"KVS Recruitment", cat:"Central Govt", desc:"All KVS teacher posts across India" },
                { icon:"📘", name:"NVS Recruitment", cat:"Central Govt", desc:"Navodaya Vidyalaya vacancies" },
                { icon:"🏛️", name:"UGC / NTA", cat:"Central Govt", desc:"UGC NET notifications & faculty posts" },
                { icon:"🇮🇳", name:"NCS Portal", cat:"National Portal", desc:"Govt of India national career portal" },
                { icon:"⚙️", name:"AICTE", cat:"Central Govt", desc:"Technical institution job notifications" },
              ].map(s => (
                <div key={s.name} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-2xl shrink-0">{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.cat}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                  </div>
                  <div className="ml-auto shrink-0"><span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">Ready</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── REVIEW QUEUE TAB ── */}
      {subTab === "queue" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {pending.length > 1 && (
              <Button variant="success" size="sm" onClick={handlePublishAll}>
                <Zap size={14} className="mr-1" />Publish All ({pending.length})
              </Button>
            )}
            <div className="flex gap-1 ml-auto">
              {[
                { v: "pending_review", l: `Pending (${pending.length})` },
                { v: "published",      l: `Published (${published.length})` },
                { v: "rejected",       l: `Rejected (${rejected.length})` },
                { v: "all",            l: "All" },
              ].map(f => (
                <button key={f.v} onClick={() => setFilter(f.v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg ${filter === f.v ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{pending.length}</p>
              <p className="text-xs text-blue-600">Pending Review</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{published.length}</p>
              <p className="text-xs text-green-600">Published Live</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{rejected.length}</p>
              <p className="text-xs text-red-600">Rejected</p>
            </div>
          </div>

          {filtered.length === 0
            ? <EmptyState icon={Database} title="Queue empty" description={filter === "pending_review" ? 'Go to "Live Fetch" tab and click Fetch All Live Jobs.' : "Nothing here."} />
            : filtered.map(sj => {
                const src = sourceInfo(sj.source_site);
                return (
                  <Card key={sj.id}
                    className={`p-5 ${sj.status === "pending_review" ? "border-l-4 border-l-blue-400" : sj.status === "published" ? "border-l-4 border-l-green-400" : "border-l-4 border-l-red-300 opacity-70"}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{src?.icon || sj.source_site}</span>
                          <h3 className="font-semibold text-sm leading-snug">{sj.title}</h3>
                        </div>
                        <p className="text-sm text-slate-600">{sj.institution}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sj.subjects?.slice(0, 3).map(s => <span key={s} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{s}</span>)}
                          {sj.states?.slice(0, 2).map(s => <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge>{sj.status}</Badge>
                        <p className="text-xs text-slate-400 mt-1">Deadline: {sj.deadline}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 bg-slate-50 p-2 rounded-lg leading-relaxed">{sj.description?.slice(0, 150)}{sj.description?.length > 150 ? "…" : ""}</p>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{sj.source_name || src?.name}</span>
                        <a href={sj.source_url} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                          <ExternalLink size={11} />Original Source
                        </a>
                      </div>
                      <div className="flex gap-2">
                        {sj.status === "pending_review" && <>
                          <Button variant="secondary" size="sm" onClick={() => setEditJob({ ...sj })}><Edit size={13} className="mr-1" />Edit</Button>
                          <Button variant="danger"    size="sm" onClick={() => handleReject(sj.id)}><XCircle size={13} className="mr-1" />Reject</Button>
                          <Button variant="success"   size="sm" onClick={() => handlePublish(sj)}><Zap size={13} className="mr-1" />Publish</Button>
                        </>}
                        {sj.status === "published" && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 size={13} />Live on site</span>}
                        {sj.status === "rejected"  && <Button variant="ghost" size="sm" onClick={() => handleRestore(sj.id)}><RefreshCw size={13} className="mr-1" />Restore</Button>}
                      </div>
                    </div>
                  </Card>
                );
              })
          }
        </div>
      )}

      {/* ── MY CUSTOM URLs TAB ── */}
      {subTab === "custom" && (
        <CustomSourceManager
          customSources={customSources}
          onAdd={addCustomSource}
          onRemove={removeCustomSource}
          onUpdate={updateCustomSource}
        />
      )}

      {/* ── BUILT-IN SOURCES TAB ── */}
      {subTab === "sources" && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
            <Info size={16} className="shrink-0 mt-0.5" />
            <span>These are the sources fetched by the <strong>/api/fetch-jobs</strong> Vercel function. To add more sources, edit <code className="bg-amber-100 px-1 rounded">api/fetch-jobs.js</code> in your GitHub repo.</span>
          </div>
          {[
            { id:"employment_news", icon:"📰", name:"Employment News", url:"https://www.employmentnews.gov.in/RSS/rss_edu.aspx", type:"RSS Feed", status:"active" },
            { id:"kvs",  icon:"🏫", name:"KVS Recruitment",  url:"https://kvsangathan.nic.in/en/recruitment-notification", type:"HTML Scrape", status:"active" },
            { id:"nvs",  icon:"📘", name:"NVS Recruitment",  url:"https://navodaya.gov.in/nvs/recruitment/en", type:"HTML Scrape", status:"active" },
            { id:"ugc",  icon:"🏛️", name:"UGC / NTA",        url:"https://ugcnetonline.in/notifications.php", type:"HTML Scrape", status:"active" },
            { id:"ncs",  icon:"🇮🇳", name:"NCS Portal",       url:"https://www.ncs.gov.in/jobsearch/SearchResult.aspx", type:"HTML Scrape", status:"active" },
            { id:"aicte",icon:"⚙️", name:"AICTE",            url:"https://www.aicte-india.org/opportunities/recruitment", type:"HTML Scrape", status:"active" },
            { id:"dsssb",icon:"🏙️", name:"DSSSB Delhi",       url:"https://dsssb.delhi.gov.in/recruitment", type:"HTML Scrape", status:"active" },
          ].map(src => (
            <Card key={src.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{src.icon}</span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{src.name}</h3>
                    <a href={src.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline break-all">{src.url}</a>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{src.type}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">● Active</span>
                    </div>
                  </div>
                </div>
                <a href={src.url} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="sm"><ExternalLink size={14} /></Button>
                </a>
              </div>
            </Card>
          ))}
          <Card className="p-4 border-dashed border-2 border-slate-300 bg-slate-50">
            <p className="text-sm text-center text-slate-500">
              Want to add state PSC portals, Employment Exchange, or university career pages?
              <br />Add them in <code className="bg-slate-100 px-1 rounded text-xs">api/fetch-jobs.js</code> → <code className="bg-slate-100 px-1 rounded text-xs">SOURCES</code> array.
            </p>
          </Card>
        </div>
      )}

      {/* Edit modal */}
      <Modal open={!!editJob} onClose={() => setEditJob(null)} title="Edit Job Before Publishing" size="md">
        {editJob && (
          <div className="space-y-4">
            <Input label="Title" value={editJob.title} onChange={e => setEditJob(p => ({ ...p, title: e.target.value }))} />
            <Input label="Institution" value={editJob.institution} onChange={e => setEditJob(p => ({ ...p, institution: e.target.value }))} />
            <Textarea label="Description" value={editJob.description} onChange={e => setEditJob(p => ({ ...p, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Min Salary (₹)" type="number" value={editJob.salaryMin} onChange={e => setEditJob(p => ({ ...p, salaryMin: Number(e.target.value) }))} />
              <Input label="Max Salary (₹)" type="number" value={editJob.salaryMax} onChange={e => setEditJob(p => ({ ...p, salaryMax: Number(e.target.value) }))} />
              <Input label="Deadline" type="date" value={editJob.deadline} onChange={e => setEditJob(p => ({ ...p, deadline: e.target.value }))} />
              <Input label="Vacancies" type="number" value={editJob.vacancies || 1} onChange={e => setEditJob(p => ({ ...p, vacancies: Number(e.target.value) }))} />
            </div>
            <div className="flex gap-3 pt-2 border-t">
              <Button variant="success" onClick={() => { setScrapedJobs(p => p.map(j => j.id === editJob.id ? editJob : j)); handlePublish(editJob); setEditJob(null); }}>
                <Zap size={14} className="mr-1" />Save & Publish
              </Button>
              <Button variant="secondary" onClick={() => { setScrapedJobs(p => p.map(j => j.id === editJob.id ? editJob : j)); setEditJob(null); }}>Save Draft</Button>
              <Button variant="ghost" onClick={() => setEditJob(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============================================================
// SUBJECTS MANAGER
// ============================================================
const SubjectsManager = ({ categories, onAddSubject, onDeleteSubject, subjectRequests, onApproveSubjectRequest, onRejectSubjectRequest }) => {
  const [selCat, setSelCat] = useState(categories[0]?.id || "");
  const [newSub, setNewSub] = useState("");
  const [search, setSearch] = useState("");
  const pendingReqs = subjectRequests.filter(r => r.status === "pending");
  const cat = categories.find(c => c.id === selCat);
  const alreadyExists = cat && cat.subjects.some(s => s.toLowerCase() === newSub.trim().toLowerCase());
  const filtered = cat ? cat.subjects.filter(s => s.toLowerCase().includes(search.toLowerCase())) : [];

  return (
    <div className="space-y-6">
      {pendingReqs.length > 0 && (
        <Card className="p-5 border-l-4 border-l-amber-400">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Bell size={16} className="text-amber-500"/>Pending Subject Requests ({pendingReqs.length})</h3>
          <div className="space-y-3">
            {pendingReqs.map(r => (
              <div key={r.id} className="flex items-start justify-between p-3 bg-amber-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-slate-900">"{r.subject}" → <span className="text-amber-700">{categories.find(c=>c.id===r.categoryId)?.icon} {r.categoryName}</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">Requested by {r.requestedBy} · {r.institution} · {r.date}</p>
                  {r.note && <p className="text-xs text-slate-600 mt-1 italic">"{r.note}"</p>}
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  <Button variant="success" size="sm" onClick={()=>onApproveSubjectRequest(r.id)}><CheckCircle2 size={13} className="mr-1"/>Approve</Button>
                  <Button variant="danger" size="sm" onClick={()=>onRejectSubjectRequest(r.id)}><XCircle size={13} className="mr-1"/>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Select Category</p>
          {categories.map(c => (
            <button key={c.id} onClick={()=>{setSelCat(c.id);setSearch("");setNewSub("");}} className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium flex items-center gap-3 ${selCat===c.id?"border-slate-800 bg-slate-50 text-slate-900":"border-slate-200 text-slate-600 hover:border-slate-300"}`}>
              <span className="text-xl">{c.icon}</span>
              <div><p>{c.name}</p><p className="text-xs font-normal text-slate-400">{c.subjects.length} subjects</p></div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {cat && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{cat.icon} {cat.name} Subjects</h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{cat.subjects.length} total</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 outline-none bg-white"
                    placeholder={`Add new subject to ${cat.name}...`}
                    value={newSub}
                    onChange={e=>setNewSub(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter"&&newSub.trim()&&!alreadyExists){ onAddSubject(selCat, newSub.trim()); setNewSub(""); }}}
                  />
                  {alreadyExists && <p className="text-xs text-red-500 mt-1">Already exists in this category.</p>}
                </div>
                <Button onClick={()=>{ if(newSub.trim()&&!alreadyExists){ onAddSubject(selCat, newSub.trim()); setNewSub(""); }}} disabled={!newSub.trim()||alreadyExists}>
                  <Plus size={15} className="mr-1"/>Add
                </Button>
              </div>
              <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-slate-50" placeholder="Search subjects..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {filtered.length===0?<p className="text-sm text-slate-400 py-4 text-center">No subjects found.</p>:filtered.map((s,i)=>(
                  <div key={s} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg hover:bg-slate-100 group">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-5">{i+1}</span>
                      <span className="text-sm text-slate-800">{s}</span>
                      {!INITIAL_CATEGORIES.find(c=>c.id===selCat)?.subjects.includes(s) && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">New</span>}
                    </div>
                    <button onClick={()=>onDeleteSubject(selCat, s)} className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded text-red-400 transition-all" title="Remove subject"><Trash2 size={13}/></button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">Changes are reflected instantly across the mega menu, job filters, and job posting form.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ADMIN DASHBOARD
// ============================================================
const AdminDashboard = ({ jobs, applications, onNavigate, adminRequests, onApproveJob, onRejectJob, onVerifyInstitution, onAddJob, onArchiveJob, onUnarchiveJob, users, scrapedJobs, setScrapedJobs, scraperConfigs, setScraperConfigs, categories, onAddSubject, onDeleteSubject, subjectRequests, onApproveSubjectRequest, onRejectSubjectRequest }) => {
  const [tab,setTab]=useState("overview");
  const [showJobForm,setShowJobForm]=useState(false);
  const [masterTab,setMasterTab]=useState("subjects");
  const [jobStatusFilter,setJobStatusFilter]=useState("all");
  const pendingJobs=jobs.filter(j=>j.status==="Pending Approval");
  const pendingReqs=adminRequests.filter(r=>r.status==="Pending");
  const pendingScraped=scrapedJobs.filter(j=>j.status==="pending_review");
  const archivedJobs=jobs.filter(j=>j.status==="Archived");
  const filteredAdminJobs=jobStatusFilter==="all"?jobs:jobStatusFilter==="archived"?archivedJobs:jobs.filter(j=>j.status===jobStatusFilter);
  const pendingSubjectReqs=subjectRequests.filter(r=>r.status==="pending");
  const adminUser={id:3,role:"admin",institution:{name:"",verified:true}};
  const tabs=[
    {id:"overview",label:"Overview"},
    {id:"scraped",label:"🌐 Live Job Fetcher",count:pendingScraped.length},
    {id:"requests",label:"Requests Inbox",count:pendingReqs.length},
    {id:"pending-jobs",label:"Pending Jobs",count:pendingJobs.length},
    {id:"post-job",label:"Post Job"},
    {id:"jobs",label:"All Jobs",count:jobs.length},
    {id:"users",label:"Users"},
    {id:"master",label:"Master Data",count:pendingSubjectReqs.length||null},
    {id:"audit",label:"Audit Logs"},
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Admin Control Panel</h1><p className="text-sm text-slate-500">Manage the TeachHire platform</p></div>
        <Button onClick={()=>setShowJobForm(true)}><Plus size={16} className="mr-2"/>Post Job Directly</Button>
      </div>
      <Tabs tabs={tabs} active={tab} onChange={setTab}/>
      <div className="mt-6">
        {tab==="overview"&&(
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard icon={Users} label="Total Users" value={users.length} color="blue"/>
              <StatCard icon={Database} label="Scraped Pending" value={pendingScraped.length} color="purple"/>
              <StatCard icon={AlertCircle} label="Pending Requests" value={pendingReqs.length} color="amber"/>
              <StatCard icon={CheckCircle2} label="Published Jobs" value={jobs.filter(j=>j.status==="Published").length} color="emerald"/>
              <StatCard icon={Bookmark} label="Archived Jobs" value={archivedJobs.length} color="slate"/>
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="p-5"><h3 className="font-semibold mb-4 flex items-center gap-2"><Tag size={16} className="text-amber-500"/>Subject Requests{pendingSubjectReqs.length>0&&<span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingSubjectReqs.length}</span>}</h3><div className="space-y-2">{pendingSubjectReqs.slice(0,3).map(r=><div key={r.id} className="p-3 bg-amber-50 rounded-lg"><p className="text-sm font-medium">"{r.subject}"</p><p className="text-xs text-slate-500">→ {r.categoryName} · by {r.requestedBy}</p></div>)}{pendingSubjectReqs.length===0&&<p className="text-sm text-slate-400 text-center py-4">No pending requests</p>}<Button variant="ghost" size="sm" className="w-full mt-2" onClick={()=>{setTab("master");setMasterTab("subjects");}}>Review →</Button></div></Card>
              <Card className="p-5"><h3 className="font-semibold mb-4 flex items-center gap-2"><Database size={16} className="text-purple-500"/>Scraped Queue</h3><div className="space-y-2">{pendingScraped.slice(0,3).map(j=><div key={j.id} className="p-3 bg-blue-50 rounded-lg"><p className="text-sm font-medium">{j.title.slice(0,40)}...</p><p className="text-xs text-slate-500">{j.institution}</p></div>)}{pendingScraped.length===0&&<p className="text-sm text-slate-400 text-center py-4">No pending jobs</p>}<Button variant="ghost" size="sm" className="w-full mt-2" onClick={()=>setTab("scraped")}>Review →</Button></div></Card>
              <Card className="p-5"><h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 size={16}/>Platform Stats</h3><div className="space-y-3">{[{l:"Total Jobs",v:jobs.length},{l:"Total Categories",v:categories.length},{l:"Total Subjects",v:categories.reduce((a,c)=>a+c.subjects.length,0)},{l:"Scraper Sources",v:scraperConfigs.length}].map(s=><div key={s.l} className="flex justify-between text-sm"><span className="text-slate-500">{s.l}</span><span className="font-semibold">{s.v}</span></div>)}</div></Card>
            </div>
          </div>
        )}
        {tab==="scraped"&&<ScrapedJobsTab scrapedJobs={scrapedJobs} setScrapedJobs={setScrapedJobs} onPublish={onAddJob} scraperConfigs={scraperConfigs} setScraperConfigs={setScraperConfigs}/>}
        {tab==="requests"&&<div className="space-y-4">{adminRequests.length===0?<EmptyState icon={MessageSquare} title="No requests" description="Recruiter requests appear here."/>:adminRequests.map(r=><Card key={r.id} className={`p-5 ${r.status==="Pending"?"border-l-4 border-l-amber-400":""}`}><div className="flex items-start justify-between mb-3"><div><h4 className="font-semibold">{r.institution}</h4><p className="text-xs text-slate-500">{r.type}·{r.date}</p><p className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg">{r.message}</p></div><Badge>{r.status}</Badge></div>{r.status==="Pending"&&<div className="flex gap-2 mt-3">{r.type==="verification"&&<Button variant="success" size="sm" onClick={()=>onVerifyInstitution(r.recruiterId,r.id)}><CheckCircle2 size={14} className="mr-1"/>Verify</Button>}{r.type==="job_approval"&&<Button variant="success" size="sm" onClick={()=>onApproveJob(r.jobId)}><CheckCircle2 size={14} className="mr-1"/>Approve</Button>}<Button variant="ghost" size="sm"><XCircle size={14} className="mr-1"/>Dismiss</Button></div>}</Card>)}</div>}
        {tab==="pending-jobs"&&<div className="space-y-4">{pendingJobs.length===0?<EmptyState icon={CheckCircle2} title="All clear" description="No jobs pending."/>:pendingJobs.map(j=><Card key={j.id} className="p-5 border-l-4 border-l-amber-400"><div className="flex items-start justify-between mb-3"><div><h3 className="font-semibold">{j.title}</h3><p className="text-sm text-slate-600">{j.institution}</p></div><Badge>Pending Approval</Badge></div><p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mb-3">{j.description?.slice(0,200)}...</p><div className="flex gap-2"><Button variant="success" size="sm" onClick={()=>onApproveJob(j.id)}><CheckCircle2 size={14} className="mr-1"/>Approve</Button><Button variant="danger" size="sm" onClick={()=>onRejectJob(j.id)}><XCircle size={14} className="mr-1"/>Reject</Button></div></Card>)}</div>}
        {tab==="post-job"&&<div className="max-w-4xl"><div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2"><Shield size={16}/>Published immediately as an official admin posting.</div><Card className="p-6"><JobPostingForm onSubmit={j=>{onAddJob(j);setTab("overview");}} onCancel={()=>setTab("overview")} user={adminUser} isAdmin categories={categories}/></Card></div>}
        {tab==="jobs"&&(
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">{[{v:"all",l:`All (${jobs.length})`},{v:"Published",l:`Published (${jobs.filter(j=>j.status==="Published").length})`},{v:"Pending Approval",l:`Pending (${pendingJobs.length})`},{v:"archived",l:`Archived (${archivedJobs.length})`},{v:"Draft",l:`Draft (${jobs.filter(j=>j.status==="Draft").length})`}].map(f=><button key={f.v} onClick={()=>setJobStatusFilter(f.v)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${jobStatusFilter===f.v?"bg-slate-800 text-white":"bg-slate-100 text-slate-600"}`}>{f.l}</button>)}</div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b"><tr><th className="text-left px-4 py-3 font-semibold">Job</th><th className="text-left px-4 py-3 font-semibold">Institution</th><th className="text-left px-4 py-3 font-semibold">Status</th><th className="text-left px-4 py-3 font-semibold">Visible</th><th className="text-left px-4 py-3 font-semibold">Actions</th></tr></thead>
                <tbody>{filteredAdminJobs.map(j=><tr key={j.id} className={`border-b hover:bg-slate-50 ${j.status==="Archived"?"opacity-60":""}`}><td className="px-4 py-3 font-medium">{j.title}</td><td className="px-4 py-3 text-slate-600">{j.institution}</td><td className="px-4 py-3"><Badge>{j.status}</Badge>{j.archivedBy==="system"&&<span className="ml-1 text-xs text-slate-400 italic">auto</span>}</td><td className="px-4 py-3">{isJobVisible(j)?<span className="text-emerald-600 text-xs">✓ Live</span>:j.status==="Archived"?<span className="text-slate-400 text-xs">📦</span>:<span className="text-red-500 text-xs">Expired</span>}</td><td className="px-4 py-3"><div className="flex gap-1">{j.status!=="Archived"?<Button variant="ghost" size="sm" title="Archive" onClick={()=>onArchiveJob(j.id,"admin")}><Bookmark size={13} className="text-slate-500"/></Button>:<Button variant="ghost" size="sm" title="Restore" onClick={()=>onUnarchiveJob(j.id)}><RefreshCw size={13} className="text-emerald-500"/></Button>}</div></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}
        {tab==="users"&&<div className="bg-white rounded-xl border overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-50 border-b"><tr><th className="text-left px-4 py-3 font-semibold">User</th><th className="text-left px-4 py-3 font-semibold">Email</th><th className="text-left px-4 py-3 font-semibold">Role</th><th className="text-left px-4 py-3 font-semibold">Verified</th><th className="text-left px-4 py-3 font-semibold">Actions</th></tr></thead><tbody>{users.map(u=><tr key={u.id} className="border-b hover:bg-slate-50"><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold">{u.name?.charAt(0)}</div><span className="font-medium">{u.name}</span></div></td><td className="px-4 py-3 text-slate-600">{u.email}</td><td className="px-4 py-3 capitalize">{u.role}</td><td className="px-4 py-3">{u.role==="recruiter"?(u.institution?.verified?<span className="text-emerald-600 text-xs font-medium">✓ Verified</span>:<span className="text-amber-600 text-xs">Unverified</span>):<span className="text-slate-400 text-xs">N/A</span>}</td><td className="px-4 py-3">{u.role==="recruiter"&&!u.institution?.verified&&<Button variant="success" size="sm" onClick={()=>onVerifyInstitution(u.id)}><CheckCircle2 size={14} className="mr-1"/>Verify</Button>}</td></tr>)}</tbody></table></div>}
        {tab==="master"&&(
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">{[{id:"subjects",l:"Subjects & Categories"},{id:"states",l:"States"},{id:"employment",l:"Employment Types"}].map(m=><button key={m.id} onClick={()=>setMasterTab(m.id)} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${masterTab===m.id?"bg-slate-800 text-white":"bg-slate-100 text-slate-600"}`}>{m.l}{m.id==="subjects"&&pendingSubjectReqs.length>0&&<span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingSubjectReqs.length}</span>}</button>)}</div>
            {masterTab==="subjects"&&<SubjectsManager categories={categories} onAddSubject={onAddSubject} onDeleteSubject={onDeleteSubject} subjectRequests={subjectRequests} onApproveSubjectRequest={onApproveSubjectRequest} onRejectSubjectRequest={onRejectSubjectRequest}/>}
            {masterTab==="states"&&<Card className="p-5"><div className="flex items-center justify-between mb-4"><h3 className="font-semibold">States</h3><Button size="sm"><Plus size={14} className="mr-1"/>Add</Button></div><div className="space-y-2">{STATES_LIST.map((s,i)=><div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span className="text-sm">{s}</span><Button variant="ghost" size="sm"><Edit size={14}/></Button></div>)}</div></Card>}
            {masterTab==="employment"&&<Card className="p-5"><div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Employment Types</h3><Button size="sm"><Plus size={14} className="mr-1"/>Add</Button></div><div className="space-y-2">{EMPLOYMENT_TYPES.map((e,i)=><div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span className="text-sm">{e}</span><Button variant="ghost" size="sm"><Edit size={14}/></Button></div>)}</div></Card>}
          </div>
        )}
        {tab==="audit"&&<Card className="p-5"><h3 className="font-semibold mb-4">Audit Logs</h3><div className="space-y-2">{[{a:"Subject Added",u:"Admin",d:"Robotics Engineering added to ENGINEERING",t:"Just now"},{a:"Subject Request",u:"System",d:"Rajesh Kumar requested Robotics Engineering",t:"1 hour ago"},{a:"Job Published via Scraper",u:"Admin",d:"Primary Teacher posted from KVS scraper",t:"6 hours ago"},{a:"Institution Verified",u:"Admin",d:"IIT Kharagpur verified",t:"1 day ago"}].map((l,i)=><div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"><div className="w-2 h-2 bg-slate-400 rounded-full mt-1.5 shrink-0"/><div><p className="text-sm font-medium">{l.a}</p><p className="text-xs text-slate-500">{l.d}</p><p className="text-xs text-slate-400">by {l.u}·{l.t}</p></div></div>)}</div></Card>}
      </div>
      <Modal open={showJobForm} onClose={()=>setShowJobForm(false)} title="Post Job (Admin)" size="lg"><div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800"><Shield size={14} className="inline mr-2"/>Published immediately.</div><JobPostingForm onSubmit={j=>{onAddJob(j);setShowJobForm(false);}} onCancel={()=>setShowJobForm(false)} user={adminUser} isAdmin categories={categories}/></Modal>
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [page,setPage]=useState("home");
  const [params,setParams]=useState({});
  const [user,setUser]=useState(null);
  const [dbReady,setDbReady]=useState(false);
  const [categories,setCategories]=useState(INITIAL_CATEGORIES);
  const [jobs,setJobs]=useState([]);
  const [apps,setApps]=useState([]);
  const [users,setUsers]=useState(SEED_USERS);
  const [adminRequests,setAdminRequests]=useState(SEED_ADMIN_REQUESTS);
  const [scrapedJobs,setScrapedJobs]=useState([]);
  const [scraperConfigs,setScraperConfigs]=useState(SEED_SCRAPER_CONFIGS);
  const [subjectRequests,setSubjectRequests]=useState(SEED_SUBJECT_REQUESTS);

  // ── Load all data from Supabase on mount ──────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        // Check for existing session
        const currentUser = await dbGetCurrentUser();
        if (currentUser) setUser(currentUser);

        // Load jobs
        try {
          const dbJobs = await dbFetchJobs();
          if (dbJobs.length > 0) {
            setJobs(dbJobs.map(j => shouldAutoArchive(j) ? {...j,status:"Archived",archivedDate:TODAY,archivedBy:"system"} : j));
          } else {
            // First run — seed the DB with demo jobs
            const seeded = await Promise.all(SEED_JOBS.map(j => dbInsertJob({...j, id: undefined})));
            setJobs(seeded);
          }
        } catch(e) {
          // DB not connected yet — fall back to seed data
          setJobs(SEED_JOBS.map(j => shouldAutoArchive(j) ? {...j,status:"Archived",archivedDate:TODAY,archivedBy:"system"} : j));
        }

        // Load applications
        try {
          const dbApps = await dbFetchApplications();
          setApps(dbApps.length > 0 ? dbApps : SEED_APPLICATIONS);
        } catch { setApps(SEED_APPLICATIONS); }

        // Load scraped jobs
        try {
          const dbScraped = await dbFetchScrapedJobs();
          setScrapedJobs(dbScraped.length > 0 ? dbScraped : SEED_SCRAPED_JOBS);
        } catch { setScrapedJobs(SEED_SCRAPED_JOBS); }

      } catch(e) {
        console.warn("DB init error (using local data):", e.message);
        setJobs(SEED_JOBS.map(j => shouldAutoArchive(j) ? {...j,status:"Archived",archivedDate:TODAY,archivedBy:"system"} : j));
        setApps(SEED_APPLICATIONS);
        setScrapedJobs(SEED_SCRAPED_JOBS);
      } finally {
        setDbReady(true);
      }
    };
    init();
  }, []);

  const nav=useCallback((p,par={})=>{setPage(p);setParams(par);window.scrollTo(0,0);},[]);

  const login=u=>{setUser(u);nav(u.role==="candidate"?"candidate-dashboard":u.role==="recruiter"?"recruiter-dashboard":"admin-dashboard");};

  const logout=async()=>{
    try { await dbSignOut(); } catch {}
    setUser(null);nav("home");
  };

  const apply=async jobId=>{
    if(!user||user.role!=="candidate")return;
    const appData={id:Date.now(),jobId,candidateId:user.id,status:"Applied",appliedDate:TODAY,notes:[],rounds:[]};
    setApps(p=>[...p,appData]);
    setJobs(p=>p.map(j=>j.id===jobId?{...j,applicants:j.applicants+1}:j));
    nav("candidate-dashboard");
    try {
      const saved = await dbInsertApplication(appData);
      setApps(p=>p.map(a=>a.id===appData.id?saved:a));
      await dbUpdateJob(jobId, {applicants: (jobs.find(j=>j.id===jobId)?.applicants||0)+1});
    } catch(e) { console.warn("Apply DB error:", e.message); }
  };

  const updateApp=(id,status)=>{
    setApps(p=>p.map(a=>a.id===id?{...a,status}:a));
    dbUpdateApplication(id,{status}).catch(e=>console.warn("UpdateApp DB:",e.message));
  };

  const addJob=async j=>{
    setJobs(p=>[...p,j]);
    try {
      const saved=await dbInsertJob({...j,id:undefined});
      setJobs(p=>p.map(jj=>jj.id===j.id?saved:jj));
    } catch(e){console.warn("AddJob DB:",e.message);}
  };

  const approveJob=id=>{
    setJobs(p=>p.map(j=>j.id===id?{...j,status:"Published"}:j));
    dbUpdateJob(id,{status:"Published"}).catch(e=>console.warn(e));
  };
  const rejectJob=id=>{
    setJobs(p=>p.map(j=>j.id===id?{...j,status:"Rejected"}:j));
    dbUpdateJob(id,{status:"Rejected"}).catch(e=>console.warn(e));
  };
  const archiveJob=(id,by="admin")=>{
    setJobs(p=>p.map(j=>j.id===id?{...j,status:"Archived",archivedDate:TODAY,archivedBy:by}:j));
    dbUpdateJob(id,{status:"Archived",archivedDate:TODAY,archivedBy:by}).catch(e=>console.warn(e));
  };
  const unarchiveJob=id=>{
    setJobs(p=>p.map(j=>j.id===id?{...j,status:"Published",archivedDate:null,archivedBy:null}:j));
    dbUpdateJob(id,{status:"Published",archivedDate:null,archivedBy:null}).catch(e=>console.warn(e));
  };

  const verifyInstitution=(recruiterId,requestId)=>{
    setUsers(p=>p.map(u=>u.id===recruiterId?{...u,institution:{...u.institution,verified:true}}:u));
    if(requestId)setAdminRequests(p=>p.map(r=>r.id===requestId?{...r,status:"Approved"}:r));
  };

  const addSubject=(categoryId,subject)=>setCategories(prev=>prev.map(c=>c.id===categoryId?{...c,subjects:[...c.subjects,subject]}:c));
  const deleteSubject=(categoryId,subject)=>setCategories(prev=>prev.map(c=>c.id===categoryId?{...c,subjects:c.subjects.filter(s=>s!==subject)}:c));
  const requestSubject=(categoryId,subject,note,requestingUser)=>{const cat=categories.find(c=>c.id===categoryId);setSubjectRequests(p=>[...p,{id:Date.now(),subject,categoryId,categoryName:cat?.name,requestedBy:requestingUser?.name,institution:requestingUser?.institution?.name,date:TODAY,status:"pending",note}]);};
  const approveSubjectRequest=id=>{const req=subjectRequests.find(r=>r.id===id);if(req){addSubject(req.categoryId,req.subject);setSubjectRequests(p=>p.map(r=>r.id===id?{...r,status:"approved"}:r));}};
  const rejectSubjectRequest=id=>setSubjectRequests(p=>p.map(r=>r.id===id?{...r,status:"rejected"}:r));

  // Wrap setScrapedJobs to also persist to DB
  const persistScrapedJobs = async (updaterOrJobs) => {
    setScrapedJobs(prev => {
      const next = typeof updaterOrJobs === "function" ? updaterOrJobs(prev) : updaterOrJobs;
      const newOnes = next.filter(j => !prev.find(p => p.id === j.id));
      if (newOnes.length > 0) dbUpsertScrapedJobs(newOnes).catch(e => console.warn("Scraped upsert:", e.message));
      const changed = next.filter(j => { const old = prev.find(p => p.id === j.id); return old && old.status !== j.status; });
      changed.forEach(j => dbUpdateScrapedJobStatus(j.id, j.status).catch(e => console.warn(e)));
      return next;
    });
  };

  if (!dbReady) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Loading TeachHire...</p>
      </div>
    </div>
  );

  const renderPage=()=>{
    switch(page){
      case "home": return <HomePage onNavigate={nav} jobs={jobs} user={user} categories={categories}/>;
      case "jobs": return <JobListingPage jobs={jobs} onNavigate={nav} filters={params} categories={categories}/>;
      case "job-detail": return <JobDetailPage job={jobs.find(j=>j.id===params.jobId)} onNavigate={nav} user={user} applications={apps} onApply={apply} categories={categories}/>;
      case "login": return <LoginPage onLogin={login} onNavigate={nav}/>;
      case "register": return <RegisterPage onNavigate={nav} onLogin={login}/>;
      case "candidate-dashboard": return user?.role==="candidate"?<CandidateDashboard user={user} applications={apps} jobs={jobs} onNavigate={nav}/>:<LoginPage onLogin={login} onNavigate={nav}/>;
      case "recruiter-dashboard": return user?.role==="recruiter"?<RecruiterDashboard user={user} jobs={jobs} applications={apps} onNavigate={nav} onUpdateApp={updateApp} onAddJob={addJob} onArchiveJob={archiveJob} onUnarchiveJob={unarchiveJob} categories={categories} onRequestSubject={requestSubject}/>:<LoginPage onLogin={login} onNavigate={nav}/>;
      case "admin-dashboard": return user?.role==="admin"?<AdminDashboard jobs={jobs} applications={apps} onNavigate={nav} adminRequests={adminRequests} onApproveJob={approveJob} onRejectJob={rejectJob} onVerifyInstitution={verifyInstitution} onAddJob={addJob} onArchiveJob={archiveJob} onUnarchiveJob={unarchiveJob} users={users} scrapedJobs={scrapedJobs} setScrapedJobs={persistScrapedJobs} scraperConfigs={scraperConfigs} setScraperConfigs={setScraperConfigs} categories={categories} onAddSubject={addSubject} onDeleteSubject={deleteSubject} subjectRequests={subjectRequests} onApproveSubjectRequest={approveSubjectRequest} onRejectSubjectRequest={rejectSubjectRequest}/>:<LoginPage onLogin={login} onNavigate={nav}/>;
      default: return <HomePage onNavigate={nav} jobs={jobs} user={user} categories={categories}/>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header user={user} onNavigate={nav} onLogout={logout} currentPage={page} onSearch={kw=>nav("jobs",{keyword:kw})}/>
      {page==="home"&&<MegaMenu categories={categories} onSelectSubject={(c,s)=>nav("jobs",{category:c,subject:s})} onSelectCategory={c=>nav("jobs",{category:c})}/>}
      <main className="flex-1">{renderPage()}</main>
      <Footer/>
    </div>
  );
}
