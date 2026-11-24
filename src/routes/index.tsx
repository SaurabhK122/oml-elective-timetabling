import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OML Timetable Lab" },
      {
        name: "description",
        content:
          "Explore 48 validated elective-allotment plans, compare faculty flexibility scenarios, and run the integer model in your browser using synthetic student preferences.",
      },
      { property: "og:title", content: "OML Timetable Lab" },
      {
        property: "og:description",
        content:
          "Elective timetabling with limited faculty flexibility. An IIM Ahmedabad academic project using synthetic student preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/lab/index.html"
      title="OML Timetable Lab: elective allotments and faculty flexibility"
      style={{
        display: "block",
        width: "100%",
        height: "100dvh",
        border: 0,
      }}
    />
  );
}
