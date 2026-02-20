import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { fetchMyAssignments } from "@/lib/api";
export default function SurveyDashboard({ onOpenSurvey })
{
  const [data, setData] = useState(null);


useEffect(() => {
  fetchMyAssignments().then(setData);
}, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="space-y-6">

      {/* Stats */}
 <div className="grid grid-cols-3 gap-4">

  <Card className="
    bg-yellow-100/40 border-yellow-200
    dark:bg-yellow-900/30 dark:border-yellow-700
    backdrop-blur-md
  ">
    <CardContent className="p-4">
      <div className="text-sm text-yellow-700 dark:text-yellow-300">Assigned</div>
      <div className="text-2xl font-semibold text-yellow-800 dark:text-yellow-200">
        {data.stats.assigned}
      </div>
    </CardContent>
  </Card>

  <Card className="
    bg-red-100/40 border-red-200
    dark:bg-red-900/30 dark:border-red-700
    backdrop-blur-md
  ">
    <CardContent className="p-4">
      <div className="text-sm text-red-700 dark:text-red-300">Pending</div>
      <div className="text-2xl font-semibold text-red-800 dark:text-red-200">
        {data.stats.pending}
      </div>
    </CardContent>
  </Card>

  <Card className="
    bg-green-100/40 border-green-200
    dark:bg-green-900/30 dark:border-green-700
    backdrop-blur-md
  ">
    <CardContent className="p-4">
      <div className="text-sm text-green-700 dark:text-green-300">Completed</div>
      <div className="text-2xl font-semibold text-green-800 dark:text-green-200">
        {data.stats.completed}
      </div>
    </CardContent>
  </Card>

</div>

      {/* Pending list */}
   <Card
  className="
    bg-white border-gray-200
    dark:bg-black/40 dark:border-white/10
    backdrop-blur-md
  "
>

  <CardContent className="p-4 space-y-2">
    <div className="font-semibold text-gray-800 dark:text-white/80">
  Pending Surveys
</div>


    {data.assignments.map(a => (
  <div
    key={a._id}
    className="border border-gray-200 dark:border-white/10 rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition"
    onClick={() => onOpenSurvey(a)}
  >
    Assignment ID: {a._id}
  </div>
))}

  </CardContent>
</Card>


    </div>
  );
}
