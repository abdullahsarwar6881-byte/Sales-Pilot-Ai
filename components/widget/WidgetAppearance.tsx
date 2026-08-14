"use client";

interface Props {
  position: string;
  setPosition: (value: string) => void;

  theme: string;
  setTheme: (value: string) => void;

  size: string;
  setSize: (value: string) => void;

  radius: string;
  setRadius: (value: string) => void;
}

export default function WidgetAppearance({
  position,
  setPosition,
  theme,
  setTheme,
  size,
  setSize,
  radius,
  setRadius,
}: Props) {
  return (
    <div
      className="
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-6
        text-slate-900
        shadow-sm
        transition-colors
        duration-300

        dark:border-slate-800
        dark:bg-slate-900
        dark:text-slate-100
      "
    >
      {/* -------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------- */}

      <h2
        className="
          text-xl
          font-bold
          text-slate-900
          transition-colors
          duration-300

          dark:text-white
        "
      >
        Appearance
      </h2>

      <p
        className="
          mt-1
          text-sm
          text-slate-500
          transition-colors
          duration-300

          dark:text-slate-400
        "
      >
        Control how your widget looks on your website.
      </p>

      {/* -------------------------------- */}
      {/* SETTINGS */}
      {/* -------------------------------- */}

      <div className="mt-8 space-y-6">
        {/* -------------------------------- */}
        {/* POSITION */}
        {/* -------------------------------- */}

        <div>
          <label
            className="
              mb-2
              block
              text-sm
              font-medium
              text-slate-700

              dark:text-slate-300
            "
          >
            Widget Position
          </label>

          <select
            value={position}
            onChange={(e) =>
              setPosition(e.target.value)
            }
            className="
              w-full
              rounded-2xl
              border
              border-slate-200
              bg-white
              px-4
              py-3
              text-slate-900
              outline-none
              transition
              focus:border-indigo-500
              focus:ring-4
              focus:ring-indigo-100

              dark:border-slate-700
              dark:bg-slate-950
              dark:text-white
              dark:focus:border-indigo-500
              dark:focus:ring-indigo-950
            "
          >
            <option value="Bottom Right">
              Bottom Right
            </option>

            <option value="Bottom Left">
              Bottom Left
            </option>

            <option value="Top Right">
              Top Right
            </option>

            <option value="Top Left">
              Top Left
            </option>
          </select>
        </div>

        {/* -------------------------------- */}
        {/* THEME */}
        {/* -------------------------------- */}

        <div>
          <label
            className="
              mb-2
              block
              text-sm
              font-medium
              text-slate-700

              dark:text-slate-300
            "
          >
            Theme
          </label>

          <select
            value={theme}
            onChange={(e) =>
              setTheme(e.target.value)
            }
            className="
              w-full
              rounded-2xl
              border
              border-slate-200
              bg-white
              px-4
              py-3
              text-slate-900
              outline-none
              transition
              focus:border-indigo-500
              focus:ring-4
              focus:ring-indigo-100

              dark:border-slate-700
              dark:bg-slate-950
              dark:text-white
              dark:focus:border-indigo-500
              dark:focus:ring-indigo-950
            "
          >
            <option value="Light">
              Light
            </option>

            <option value="Dark">
              Dark
            </option>

            <option value="Auto">
              Auto
            </option>
          </select>

          {/* Current Theme */}

          <p
            className="
              mt-2
              text-xs
              text-slate-500

              dark:text-slate-400
            "
          >
            Current widget theme:{" "}
            <span
              className="
                font-semibold
                text-slate-700

                dark:text-slate-200
              "
            >
              {theme}
            </span>
          </p>
        </div>

        {/* -------------------------------- */}
        {/* SIZE */}
        {/* -------------------------------- */}

        <div>
          <label
            className="
              mb-2
              block
              text-sm
              font-medium
              text-slate-700

              dark:text-slate-300
            "
          >
            Widget Size
          </label>

          <select
            value={size}
            onChange={(e) =>
              setSize(e.target.value)
            }
            className="
              w-full
              rounded-2xl
              border
              border-slate-200
              bg-white
              px-4
              py-3
              text-slate-900
              outline-none
              transition
              focus:border-indigo-500
              focus:ring-4
              focus:ring-indigo-100

              dark:border-slate-700
              dark:bg-slate-950
              dark:text-white
              dark:focus:border-indigo-500
              dark:focus:ring-indigo-950
            "
          >
            <option value="Small">
              Small
            </option>

            <option value="Medium">
              Medium
            </option>

            <option value="Large">
              Large
            </option>
          </select>
        </div>

        {/* -------------------------------- */}
        {/* BORDER RADIUS */}
        {/* -------------------------------- */}

        <div>
          <label
            className="
              mb-2
              block
              text-sm
              font-medium
              text-slate-700

              dark:text-slate-300
            "
          >
            Border Radius
          </label>

          <select
            value={radius}
            onChange={(e) =>
              setRadius(e.target.value)
            }
            className="
              w-full
              rounded-2xl
              border
              border-slate-200
              bg-white
              px-4
              py-3
              text-slate-900
              outline-none
              transition
              focus:border-indigo-500
              focus:ring-4
              focus:ring-indigo-100

              dark:border-slate-700
              dark:bg-slate-950
              dark:text-white
              dark:focus:border-indigo-500
              dark:focus:ring-indigo-950
            "
          >
            <option value="Rounded">
              Rounded
            </option>

            <option value="Square">
              Square
            </option>

            <option value="Pill">
              Pill
            </option>
          </select>
        </div>
      </div>
    </div>
  );
}